package cop.kbds.agilemvp.analysis.client;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot;
import cop.kbds.agilemvp.analysis.service.AnalyticsSnapshot.*;
import cop.kbds.agilemvp.analysis.service.AnalysisResultValidator;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.insight.config.BedrockProperties;
import cop.kbds.agilemvp.insight.exception.InsightErrorCode;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.*;

class BedrockAnalysisInterpreterTest {
    private final ObjectMapper json = new ObjectMapper();
    private BedrockRuntimeClient client;
    private BedrockAnalysisInterpreter interpreter;
    private static final String VALID = """
            {"findings":[{"observationId":"obs.category.id:1","evidenceIds":["category.id:1.amount"],
              "interpretation":"관측 소비 {{category.id:1.amount}}를 확인해 보세요.","importance":"HIGH","limitations":["자료 완결성 미확인"]}],
             "opportunities":[{"categoryId":1,"evidenceIds":["category.id:1.amount"],"observationIds":["obs.category.id:1"],
              "direction":"REDUCE_SPENDING","rationale":"관측 소비 {{category.id:1.amount}}를 기준으로 상한을 선택해 보세요."}]}
            """;

    @BeforeEach void setUp() {
        client = mock(BedrockRuntimeClient.class);
        interpreter = new BedrockAnalysisInterpreter(client, properties(1200), json);
    }

    @Test void completeResponseKeepsEvidenceLinksAndHasEnoughBudgetForTheVnextContract() throws Exception {
        given(client.converse(any(ConverseRequest.class))).willReturn(response(VALID, StopReason.END_TURN));
        var result = new AnalysisResultValidator().validate(snapshot(), interpreter.interpret(snapshot()));
        assertThat(result.findings()).hasSize(1);
        assertThat(result.opportunities()).singleElement().satisfies(o -> {
            assertThat(o.categoryId()).isEqualTo(1L);
            assertThat(o.findingIds()).containsExactly(result.findings().getFirst().id());
        });
        var request = ArgumentCaptor.forClass(ConverseRequest.class);
        verify(client).converse(request.capture());
        assertThat(request.getValue().inferenceConfig().maxTokens()).isEqualTo(4096);
        var input = json.readTree(request.getValue().messages().getFirst().content().getFirst().text());
        assertThat(input.has("records")).isFalse();
        assertThat(input.get("evidence").get(0).get("id").asText()).isEqualTo("category.id:1.amount");
    }

    @Test void configuredLargerBudgetIsRespected() {
        interpreter = new BedrockAnalysisInterpreter(client, properties(8192), json);
        given(client.converse(any(ConverseRequest.class))).willReturn(response(VALID, StopReason.END_TURN));
        interpreter.interpret(snapshot());
        var request = ArgumentCaptor.forClass(ConverseRequest.class);
        verify(client).converse(request.capture());
        assertThat(request.getValue().inferenceConfig().maxTokens()).isEqualTo(8192);
    }

    @Test void numericCorrectionSuppliesTheRejectedDraftAndKeepsTheEvidenceContract() throws Exception {
        var rejected = json.readValue(VALID.replace("관측 소비 {{category.id:1.amount}}", "관측 소비 1000원"), AnalysisInterpreter.Draft.class);
        given(client.converse(any(ConverseRequest.class))).willReturn(response(VALID, StopReason.END_TURN));
        var corrected = interpreter.correctProse(snapshot(), rejected, "LITERAL_NUMBER");
        assertThat(new AnalysisResultValidator().validate(snapshot(), corrected).opportunities()).hasSize(1);
        var request = ArgumentCaptor.forClass(ConverseRequest.class);
        verify(client, times(1)).converse(request.capture());
        var messages = request.getValue().messages();
        assertThat(messages).extracting(Message::role)
                .containsExactly(ConversationRole.USER, ConversationRole.ASSISTANT, ConversationRole.USER);
        assertThat(json.readValue(messages.get(1).content().getFirst().text(), AnalysisInterpreter.Draft.class)).isEqualTo(rejected);
        assertThat(messages.getLast().content().getFirst().text()).contains("LITERAL_NUMBER", "{{evidenceId}}");
    }

    @Test void tokenLimitRejectsEvenParseablePartialResultsWithoutAnotherModelCall() {
        given(client.converse(any(ConverseRequest.class))).willReturn(response(VALID, StopReason.MAX_TOKENS));
        assertFailure(InsightErrorCode.INVALID_MODEL_RESPONSE);
        verify(client, times(1)).converse(any(ConverseRequest.class));
    }

    @Test void tokenCorrectionSuppliesTheReasonAndKeepsTheOriginalReferences() throws Exception {
        var rejected = json.readValue(VALID.replace("{{category.id:1.amount}}", "{{invented}}"), AnalysisInterpreter.Draft.class);
        given(client.converse(any(ConverseRequest.class))).willReturn(response(VALID, StopReason.END_TURN));
        var corrected = interpreter.correctProse(snapshot(), rejected, "UNKNOWN_EVIDENCE_TOKEN");
        assertThat(new AnalysisResultValidator().validate(snapshot(), corrected).opportunities()).hasSize(1);
        var request = ArgumentCaptor.forClass(ConverseRequest.class);
        verify(client, times(1)).converse(request.capture());
        var messages = request.getValue().messages();
        assertThat(json.readValue(messages.get(1).content().getFirst().text(), AnalysisInterpreter.Draft.class)).isEqualTo(rejected);
        assertThat(messages.getLast().content().getFirst().text())
                .contains("UNKNOWN_EVIDENCE_TOKEN", "evidenceIds", "문자열을 정확히 복사", "근거 연결은 유지");
    }

    @Test void optionalCodeFenceIsParsedOnlyAfterNormalCompletion() {
        given(client.converse(any(ConverseRequest.class))).willReturn(response("```json\n" + VALID + "\n```", StopReason.END_TURN));
        assertThat(interpreter.interpret(snapshot()).findings()).hasSize(1);
    }

    @Test void malformedJsonAndUnexpectedFieldsAreRejected() {
        given(client.converse(any(ConverseRequest.class)))
                .willReturn(response("{\"findings\":[", StopReason.END_TURN))
                .willReturn(response("{\"findings\":[],\"opportunities\":[],\"invented\":true}", StopReason.END_TURN));
        assertFailure(InsightErrorCode.INVALID_MODEL_RESPONSE);
        assertFailure(InsightErrorCode.INVALID_MODEL_RESPONSE);
    }

    @Test void serviceFailureAndTimeoutKeepTheirDistinctErrorCodes() {
        given(client.converse(any(ConverseRequest.class)))
                .willThrow(AccessDeniedException.builder().message("denied").statusCode(403).build())
                .willThrow(ModelTimeoutException.builder().message("timeout").build());
        assertFailure(InsightErrorCode.SERVICE_UNAVAILABLE);
        assertFailure(InsightErrorCode.GENERATION_TIMEOUT);
    }

    private void assertFailure(InsightErrorCode code) {
        assertThatThrownBy(() -> interpreter.interpret(snapshot())).isInstanceOfSatisfying(BusinessException.class,
                exception -> assertThat(exception.getErrorCode()).isEqualTo(code));
    }
    private BedrockProperties properties(int tokens) {
        return new BedrockProperties(true, "ap-northeast-2", "global.anthropic.claude-sonnet-4-6", tokens, 0.2f, Duration.ofSeconds(30));
    }
    private ConverseResponse response(String text, StopReason reason) {
        return ConverseResponse.builder().stopReason(reason)
                .usage(TokenUsage.builder().inputTokens(100).outputTokens(100).totalTokens(200).build())
                .output(ConverseOutput.builder().message(Message.builder().role(ConversationRole.ASSISTANT)
                        .content(ContentBlock.fromText(text)).build()).build()).build();
    }
    private AnalyticsSnapshot snapshot() {
        var period = new Period("2026-08-01", "2026-09-01");
        var source = new SourceScope("ALL_CARDS", List.of("테스트 카드"));
        var quality = new Quality(10, 10, 0, Map.of(), 0, 0, 0, 0, 0, 0, 0, "UNKNOWN", "NOT_CONFIRMED", List.of());
        var category = new Aggregate("id:1", 1L, "식음료", null, 1000, 10, BigDecimal.valueOf(100), BigDecimal.valueOf(100), List.of());
        var evidence = new Evidence("category.id:1.amount", "CATEGORY_AMOUNT", BigDecimal.valueOf(1000), "KRW", null,
                period, source, "id:1", 1L, "식음료", null, List.of());
        return new AnalyticsSnapshot(new Query("ALL", null, null, List.of(), List.of()), period, source, "spending-v1", "test-revision",
                1000, 10, List.of(), List.of(category), List.of(), List.of(), "day", quality, List.of(evidence),
                List.of(new Observation("obs.category.id:1", "CATEGORY_DISTRIBUTION", "id:1", 1L, List.of(evidence.id()))));
    }
}
