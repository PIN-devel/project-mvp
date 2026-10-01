package cop.kbds.agilemvp.transaction.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;

import com.fasterxml.jackson.databind.ObjectMapper;
import cop.kbds.agilemvp.auth.config.SecurityConfig;
import cop.kbds.agilemvp.auth.service.JwtProvider;
import cop.kbds.agilemvp.category.repository.CategoryRepository;
import cop.kbds.agilemvp.common.exception.GlobalExceptionHandler;
import cop.kbds.agilemvp.excel.controller.ExcelController;
import cop.kbds.agilemvp.excel.service.ExcelService;
import cop.kbds.agilemvp.transaction.service.TransactionService;
import cop.kbds.agilemvp.user.service.User;
import cop.kbds.agilemvp.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {ExcelController.class, TransactionController.class})
@Import({GlobalExceptionHandler.class, SecurityConfig.class, ExcelService.class})
class TransactionUploadContractTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private TransactionService transactionService;
    @MockitoBean private CategoryRepository categoryRepository;
    @MockitoBean private JwtProvider jwtProvider;
    @MockitoBean private UserService userService;

    @Test
    void savesSixMonthExcelPreviewThroughBulkEndpoint() throws Exception {
        var user = new User(1L, "tester", "테스터", "hash", "active", null, null, null);
        var auth = new UsernamePasswordAuthenticationToken(user, null, List.of());
        given(transactionService.addBulk(anyList(), eq(1L)))
                .willAnswer(invocation -> new BulkUploadResult(invocation.getArgument(0), 0));
        byte[] workbook = syntheticWorkbook();
        var file = new MockMultipartFile("file", "six-month.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbook);
        String preview = mockMvc.perform(multipart("/api/excel/upload").file(file)
                        .with(authentication(auth)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var json = new ObjectMapper();
        var rows = json.readTree(preview);
        assertThat(rows.size()).isEqualTo(146);
        // Zod strips top-level persisted but retains the computed foundation in the legacy client.
        for (var row : rows) ((com.fasterxml.jackson.databind.node.ObjectNode) row).remove("persisted");
        mockMvc.perform(post("/api/transactions/bulk").with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(rows)))
                .andExpect(status().isCreated());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TransactionDto>> saved = ArgumentCaptor.forClass(List.class);
        verify(transactionService).addBulk(saved.capture(), eq(1L));
        assertThat(saved.getValue()).hasSize(146);
        assertThat(saved.getValue().getFirst().getTransactionDate()).isEqualTo("2026-04-01");
        assertThat(saved.getValue().getFirst().getAmount()).isEqualTo(1000L);
        assertThat(saved.getValue().stream().filter(row -> "취소".equals(row.getStatus())).count()).isEqualTo(1);
    }

    @Test
    void writablePayloadDefaultsInternalFlagsAndTracksExplicitTag() throws Exception {
        var user = new User(1L, "tester", "테스터", "hash", "active", null, null, null);
        var auth = new UsernamePasswordAuthenticationToken(user, null, List.of());
        given(transactionService.addBulk(anyList(), eq(1L)))
                .willAnswer(invocation -> new BulkUploadResult(invocation.getArgument(0), 0));
        String input = """
                [{"transactionDate":"2026-04-01","merchant":"합성 가맹점","amount":1000,
                  "cardName":"신한카드","installment":1,"status":"승인","tag":null}]
                """;
        mockMvc.perform(post("/api/transactions/bulk").with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON).content(input))
                .andExpect(status().isCreated());
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TransactionDto>> saved = ArgumentCaptor.forClass(List.class);
        verify(transactionService).addBulk(saved.capture(), eq(1L));
        var transaction = saved.getValue().getFirst();
        assertThat(transaction.isPersisted()).isFalse();
        assertThat(transaction.isTagSpecified()).isTrue();
        assertThat(transaction.getAppliedRuleId()).isNull();
        assertThat(transaction.getFoundation().spendingEligible()).isFalse();
    }

    @Test
    void editingWithoutTagKeepsTagUnspecifiedAndIgnoresClientSemantics() throws Exception {
        var user = new User(1L, "tester", "테스터", "hash", "active", null, null, null);
        var auth = new UsernamePasswordAuthenticationToken(user, null, List.of());
        mockMvc.perform(put("/api/transactions/1").with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"transactionDate":"2026-04-01","merchant":"합성 가맹점","amount":1000,
                                 "cardName":"신한카드","installment":1,"status":"승인",
                                 "persisted":true,"appliedRuleId":99,"tagSpecified":true,
                                 "foundation":{"spendingEligible":true}}
                                """))
                .andExpect(status().isOk());
        var saved = ArgumentCaptor.forClass(TransactionDto.class);
        verify(transactionService).update(eq(1L), saved.capture(), eq(1L));
        assertThat(saved.getValue().isTagSpecified()).isFalse();
        assertThat(saved.getValue().isPersisted()).isFalse();
        assertThat(saved.getValue().getAppliedRuleId()).isNull();
        assertThat(saved.getValue().getFoundation().spendingEligible()).isFalse();
    }

    private byte[] syntheticWorkbook() throws Exception {
        try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("합성 테스트");
            String[] headers = {"거래일", "가맹점명", "금액", "이용구분", "취소상태"};
            var header = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) header.createCell(i).setCellValue(headers[i]);
            for (int i = 0; i < 146; i++) {
                var row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(LocalDate.of(2026, 4, 1).plusDays(i).toString());
                row.createCell(1).setCellValue("합성 가맹점 " + i);
                row.createCell(2).setCellValue(1000 + i);
                row.createCell(3).setCellValue("일시불");
                row.createCell(4).setCellValue(i == 145 ? "취소" : "");
            }
            workbook.write(output);
            return output.toByteArray();
        }
    }
}
