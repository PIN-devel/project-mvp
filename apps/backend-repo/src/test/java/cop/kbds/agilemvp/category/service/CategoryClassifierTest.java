package cop.kbds.agilemvp.category.service;

import cop.kbds.agilemvp.insight.config.BedrockProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseRequest;
import software.amazon.awssdk.services.bedrockruntime.model.ConverseResponse;
import software.amazon.awssdk.services.bedrockruntime.model.Message;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class CategoryClassifierTest {
    @SuppressWarnings("unchecked")
    private final ObjectProvider<BedrockRuntimeClient> provider = mock(ObjectProvider.class);
    private final BedrockRuntimeClient client = mock(BedrockRuntimeClient.class);
    private final CategoryClassifier classifier = new CategoryClassifier(provider,
            new BedrockProperties(true, "region", "model", 1200, 0.2f, Duration.ofSeconds(30)));

    @Test
    void acceptsValidLinesEvenWithFencesExplanationMissingAndInvalidRows() {
        assertThat(CategoryClassifier.parse("""
                ```text
                1|식음료
                2|새 카테고리
                99|쇼핑
                3|교통|설명
                설명입니다
                4 | 교육
                ```
                """, Set.of("1", "2", "3", "4", "5")))
                .containsOnly(java.util.Map.entry("1", "식음료"), java.util.Map.entry("4", "교육"));
    }

    @Test
    void keywordsWinAndModelOnlySeesDistinctUnresolvedMerchants() {
        when(provider.getIfAvailable()).thenReturn(client);
        when(client.converse(any(ConverseRequest.class))).thenReturn(response("1|교육\n2|존재하지않음"));
        var result = classifier.classify(List.of("스타벅스", "ABC 배움터", "ABC 배움터", "알수없는 곳"));
        assertThat(result).containsEntry("스타벅스", "식음료")
                .containsEntry("ABC 배움터", "교육").containsEntry("알수없는 곳", "기타");
        var request = org.mockito.ArgumentCaptor.forClass(ConverseRequest.class);
        verify(client, times(1)).converse(request.capture());
        assertThat(request.getValue().messages().getFirst().content().getFirst().text())
                .isEqualTo("1: ABC 배움터\n2: 알수없는 곳");
        assertThat(request.getValue().overrideConfiguration().orElseThrow().apiCallTimeout())
                .contains(Duration.ofSeconds(8));
    }

    @Test
    void runtimeTimeoutMalformedAndEmptyResponsesKeepFallback() {
        when(provider.getIfAvailable()).thenReturn(client);
        when(client.converse(any(ConverseRequest.class)))
                .thenThrow(new IllegalStateException("model unavailable"))
                .thenReturn(response("not JSON and no matching lines"))
                .thenReturn(ConverseResponse.builder().build());
        for (int i = 0; i < 3; i++) {
            assertThat(classifier.classify(List.of("알수없는 곳", "GS25")))
                    .containsEntry("알수없는 곳", "기타").containsEntry("GS25", "편의점");
        }
        verify(client, times(3)).converse(any(ConverseRequest.class));
    }

    @Test
    void disabledBedrockAndOversizedBatchAreSafe() {
        var disabled = new CategoryClassifier(provider,
                new BedrockProperties(false, null, null, null, null, null));
        assertThat(disabled.classify(List.of("GS25", "알수없는 곳")))
                .containsEntry("GS25", "편의점").containsEntry("알수없는 곳", "기타");
        verifyNoInteractions(provider);
        when(provider.getIfAvailable()).thenReturn(client);
        when(client.converse(any(ConverseRequest.class))).thenReturn(response("100|교육\n101|교통"));
        var merchants = IntStream.rangeClosed(1, 120).mapToObj(index -> "모르는상호 " + index).toList();
        assertThat(classifier.classify(merchants)).hasSize(120)
                .containsEntry("모르는상호 100", "교육").containsEntry("모르는상호 101", "기타");
        verify(client, times(1)).converse(any(ConverseRequest.class));
    }

    private ConverseResponse response(String text) {
        return ConverseResponse.builder().output(output -> output.message(Message.builder()
                .content(ContentBlock.fromText(text)).build())).build();
    }
}
