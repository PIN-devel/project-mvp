package cop.kbds.agilemvp.rule.service;

import cop.kbds.agilemvp.category.exception.CategoryErrorCode;
import cop.kbds.agilemvp.category.service.CategoryService;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.excel.service.ExcelService;
import cop.kbds.agilemvp.transaction.controller.BulkUploadResult;
import cop.kbds.agilemvp.transaction.controller.TransactionDto;
import cop.kbds.agilemvp.transaction.service.TransactionService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class RuleServiceIntegrationTest {

    @Autowired
    private RuleService ruleService;

    @Autowired
    private CategoryService categoryService;

    @Autowired
    private ExcelService excelService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("규칙 삭제 복원은 해당 규칙이 적용한 거래만 되돌린다")
    void deleteWithRestore_RestoresOnlyRuleAppliedTransactions() {
        Long userId = createUser("restore-user", "복원유저");
        Long foodId = categoryId("식음료");

        Long appliedTargetId = insertTransaction(userId, "2026-07-01", "스타벅스 강남점", null, 6200L, null, false);
        Long manualTargetId = insertTransaction(userId, "2026-07-02", "스타벅스 수동분류", foodId, 7000L, "#커피", true);

        ruleService.create(userId, "스타벅스", foodId, "커피");
        Long ruleId = ruleId(userId, "스타벅스");

        ruleService.delete(ruleId, userId, true);

        Map<String, Object> restored = transaction(appliedTargetId);
        assertThat(restored.get("CATEGORY_ID")).isNull();
        assertThat(restored.get("TAG")).isEqualTo("#커피");
        assertThat(restored.get("IS_CLASSIFIED")).isEqualTo(false);
        assertThat(restored.get("APPLIED_RULE_ID")).isNull();

        Map<String, Object> manual = transaction(manualTargetId);
        assertThat(((Number) manual.get("CATEGORY_ID")).longValue()).isEqualTo(foodId);
        assertThat(manual.get("TAG")).isEqualTo("#커피");
        assertThat(manual.get("IS_CLASSIFIED")).isEqualTo(true);
        assertThat(manual.get("APPLIED_RULE_ID")).isNull();
    }

    @Test
    @DisplayName("규칙 키워드의 LIKE 메타문자는 일반 문자로 매칭한다")
    void create_EscapesLikeWildcardKeyword() {
        Long userId = createUser("wildcard-user", "와일드유저");
        Long foodId = categoryId("식음료");

        Long percentMerchantId = insertTransaction(userId, "2026-07-03", "100%커피", null, 5000L, null, false);
        Long normalMerchantId = insertTransaction(userId, "2026-07-04", "100원커피", null, 5000L, null, false);

        ruleService.create(userId, "100%", foodId, "이벤트");

        assertThat(transaction(percentMerchantId).get("IS_CLASSIFIED")).isEqualTo(true);
        assertThat(transaction(normalMerchantId).get("IS_CLASSIFIED")).isEqualTo(false);
    }

    @Test
    @DisplayName("패턴 추천 카테고리는 실제 기본 카테고리 ID와 함께 반환한다")
    void findUnclassifiedPatterns_ReturnsExistingRecommendedCategory() {
        Long userId = createUser("pattern-user", "패턴유저");
        Long foodId = categoryId("식음료");
        insertTransaction(userId, "2026-07-05", "스타벅스 강남점", null, 6200L, null, false);
        insertTransaction(userId, "2026-07-06", "스타벅스 선릉점", null, 6100L, null, false);

        List<RulePattern> patterns = ruleService.findUnclassifiedPatterns(userId);

        RulePattern starbucks = patterns.stream()
                .filter(pattern -> pattern.keyword().equals("스타벅스"))
                .findFirst()
                .orElseThrow();
        assertThat(starbucks.recommendedCategoryName()).isEqualTo("식음료");
        assertThat(starbucks.recommendedCategoryId()).isEqualTo(foodId);
    }

    @Test
    @DisplayName("가맹점 괄호 접미사를 정규화하고 편의점과 로컬푸드 카테고리를 추천한다")
    void findUnclassifiedPatterns_NormalizesMerchantAndRecommendsQaCategories() {
        Long userId = createUser("pattern-qa-user", "패턴QA유저");
        Long convenienceStoreId = categoryId("편의점");
        Long shoppingId = categoryId("쇼핑");
        insertTransaction(userId, "2026-08-01", "세븐일레븐 강남점", null, 3200L, null, false);
        insertTransaction(userId, "2026-08-02", "세븐일레븐 선릉점", null, 4100L, null, false);
        insertTransaction(userId, "2026-08-03", "원당농협로컬푸드직매장", null, 18000L, null, false);
        insertTransaction(userId, "2026-08-04", "원당농협로컬푸드직매장", null, 23000L, null, false);
        insertTransaction(userId, "2026-08-05", "쿠팡(쿠페이 일시불", null, 29000L, null, false);
        insertTransaction(userId, "2026-08-06", "쿠팡(쿠페이)", null, 15000L, null, false);

        Map<String, RulePattern> patternsByKeyword = ruleService.findUnclassifiedPatterns(userId).stream()
                .collect(Collectors.toMap(RulePattern::keyword, pattern -> pattern));

        assertThat(patternsByKeyword.get("세븐일레븐").recommendedCategoryName()).isEqualTo("편의점");
        assertThat(patternsByKeyword.get("세븐일레븐").recommendedCategoryId()).isEqualTo(convenienceStoreId);
        assertThat(patternsByKeyword.get("원당농협로컬푸드직매장").recommendedCategoryName()).isEqualTo("쇼핑");
        assertThat(patternsByKeyword.get("원당농협로컬푸드직매장").recommendedCategoryId()).isEqualTo(shoppingId);
        assertThat(patternsByKeyword.get("쿠팡").recommendedCategoryName()).isEqualTo("쇼핑");
        assertThat(patternsByKeyword.get("쿠팡").recommendedCategoryId()).isEqualTo(shoppingId);
    }

    @Test
    @DisplayName("카테고리 삭제 시 연결된 거래는 미분류 상태로 동기화한다")
    void deleteCategory_DetachesTransactions() {
        Long userId = createUser("category-user", "카테고리유저");
        Long categoryId = createCategory(userId, "반려동물");
        Long transactionId = insertTransaction(userId, "2026-07-07", "동물병원", categoryId, 30000L, "#수동", true);

        categoryService.delete(categoryId, userId);

        Map<String, Object> transaction = transaction(transactionId);
        assertThat(transaction.get("CATEGORY_ID")).isNull();
        assertThat(transaction.get("TAG")).isEqualTo("#수동");
        assertThat(transaction.get("IS_CLASSIFIED")).isEqualTo(false);
        assertThat(transaction.get("APPLIED_RULE_ID")).isNull();
    }

    @Test
    @DisplayName("규칙에서 사용하는 카테고리는 삭제할 수 없다")
    void deleteCategory_WhenUsedByRule_ThrowsConflict() {
        Long userId = createUser("rule-category-user", "규칙카테고리유저");
        Long categoryId = createCategory(userId, "구독관리");
        ruleService.create(userId, "넷플릭스", categoryId, "구독");

        assertThatThrownBy(() -> categoryService.delete(categoryId, userId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining(CategoryErrorCode.CATEGORY_IN_USE.getMessage());
    }

    @Test
    @DisplayName("커스텀 카테고리는 사용자별로 격리된다")
    void customCategory_IsScopedByUser() {
        Long userA = createUser("category-owner-a", "카테고리소유자A");
        Long userB = createUser("category-owner-b", "카테고리소유자B");

        Long userACategoryId = createCategory(userA, "개인카테고리");
        Long userBCategoryId = createCategory(userB, "개인카테고리");

        assertThat(categoryService.findAll(userA))
                .extracting("id")
                .contains(userACategoryId);
        assertThat(categoryService.findAll(userB))
                .extracting("id")
                .doesNotContain(userACategoryId);
        assertThat(categoryService.findAll(userB))
                .extracting("id")
                .contains(userBCategoryId);
        assertThatThrownBy(() -> ruleService.create(userB, "개인", userACategoryId, "태그"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("커스텀 카테고리는 전역 카테고리와 같은 이름을 사용할 수 있다")
    void customCategory_CanUseGlobalCategoryName() {
        Long userId = createUser("global-name-user", "전역명유저");
        Long categoryId = createCategory(userId, "개인카테고리");

        categoryService.create(userId, "기타", "#654321");
        categoryService.update(categoryId, userId, "식음료", "#abcdef");

        assertThat(categoryService.findAll(userId))
                .filteredOn(category -> category.getUserId() != null && category.getUserId().equals(userId))
                .extracting("name")
                .contains("기타", "식음료");
    }

    @Test
    @DisplayName("템플릿 엑셀 업로드는 사용자 커스텀 카테고리를 유효한 카테고리로 인식한다")
    void parseUpload_AllowsUserScopedCategory() throws Exception {
        Long userId = createUser("excel-category-user", "엑셀카테고리유저");
        createCategory(userId, "반려동물");

        MockMultipartFile file = templateExcelFile("반려동물");

        List<TransactionDto> transactions = excelService.parseUpload(file, userId);

        assertThat(transactions).hasSize(1);
        assertThat(transactions.get(0).getUserId()).isEqualTo(userId);
        assertThat(transactions.get(0).getCategoryName()).isEqualTo("반려동물");
        assertThat(transactions.get(0).getIsClassified()).isTrue();
    }

    @Test
    @DisplayName("카드사 원본 엑셀 업로드는 룰 엔진 분류를 위해 카테고리를 자동 확정하지 않는다")
    void parseUpload_CardCompanyFormatKeepsTransactionsUnclassified() throws Exception {
        Long userId = createUser("card-excel-user", "카드엑셀유저");

        MockMultipartFile file = shinhanExcelFile();

        List<TransactionDto> transactions = excelService.parseUpload(file, userId);

        assertThat(transactions).hasSize(1);
        assertThat(transactions.get(0).getUserId()).isEqualTo(userId);
        assertThat(transactions.get(0).getMerchant()).isEqualTo("스타벅스 강남점");
        assertThat(transactions.get(0).getCategoryName()).isNull();
        assertThat(transactions.get(0).getIsClassified()).isFalse();
        assertThat(transactions.get(0).getAmount()).isEqualTo(6200L);
    }

    @Test
    @DisplayName("엑셀 일괄 업로드는 기존 사용자 규칙을 새 거래에 자동 적용한다")
    void addBulk_AppliesExistingRulesToImportedTransactions() throws Exception {
        Long userId = createUser("bulk-rule-user", "일괄규칙유저");
        Long foodId = categoryId("식음료");
        ruleService.create(userId, "스타벅스", foodId, "커피");

        List<TransactionDto> transactions = excelService.parseUpload(shinhanExcelFile(), userId);

        BulkUploadResult result = transactionService.addBulk(transactions, userId);

        assertThat(result.skippedCount()).isZero();
        assertThat(result.added()).hasSize(1);
        TransactionDto added = result.added().getFirst();
        assertThat(added.getCategoryId()).isEqualTo(foodId);
        assertThat(added.getCategoryName()).isEqualTo("식음료");
        assertThat(added.getTag()).isEqualTo("#커피");
        assertThat(added.getIsClassified()).isTrue();

        Map<String, Object> transaction = transaction(added.getId());
        assertThat(((Number) transaction.get("CATEGORY_ID")).longValue()).isEqualTo(foodId);
        assertThat(transaction.get("TAG")).isEqualTo("#커피");
        assertThat(transaction.get("IS_CLASSIFIED")).isEqualTo(true);
        assertThat(transaction.get("APPLIED_RULE_ID")).isNotNull();
    }

    @Test
    @DisplayName("엑셀 일괄 업로드는 기존 중복 거래를 건너뛰고 신규 거래를 저장한다")
    void addBulk_WithExistingDuplicate_SkipsDuplicateAndAddsRemainingTransactions() {
        Long userId = createUser("bulk-duplicate-user", "일괄중복유저");
        insertTransaction(userId, "2026-07-10", "메가MGC커피", null, 3900L, null, false);

        List<TransactionDto> transactions = List.of(
                TransactionDto.builder()
                        .transactionDate("2026-07-10")
                        .merchant("메가MGC커피")
                        .amount(3900L)
                        .cardName("테스트카드")
                        .installment(1)
                        .status("승인")
                        .build(),
                TransactionDto.builder()
                        .transactionDate("2026-07-11")
                        .merchant("신규가맹점")
                        .amount(12000L)
                        .cardName("테스트카드")
                        .installment(1)
                        .status("승인")
                        .build()
        );

        BulkUploadResult result = transactionService.addBulk(transactions, userId);

        assertThat(result.skippedCount()).isEqualTo(1);
        assertThat(result.added()).hasSize(1);
        assertThat(result.added().getFirst().getMerchant()).isEqualTo("신규가맹점");
        assertThat(transactionService.findAll(userId))
                .extracting(TransactionDto::getMerchant)
                .containsExactlyInAnyOrder("메가MGC커피", "신규가맹점");
    }

    @Test
    void automaticImportPreservesExplicitAndRuleCategoriesAndAllowsCorrections() {
        Long userId = createUser("auto-classification", "자동분류유저");
        Long shoppingId = categoryId("쇼핑");
        Long foodId = categoryId("식음료");
        Long educationId = categoryId("교육");
        ruleService.create(userId, "스타벅스", educationId, "내규칙");
        var rows = List.of(
                importRow("스타벅스 강남점", null),
                importRow("스타벅스 수동", shoppingId),
                importRow("맥도날드", null),
                importRow("알수없는 가맹점", null));
        BulkUploadResult result = transactionService.addBulk(rows, userId);
        assertThat(result.added()).extracting(TransactionDto::getCategoryId)
                .containsExactly(educationId, shoppingId, foodId, categoryId("기타"));
        assertThat(result.added().getFirst().getAppliedRuleId()).isEqualTo(ruleId(userId, "스타벅스"));
        assertThat(result.added().getFirst().getTag()).isEqualTo("#내규칙");
        assertThat(result.added()).allSatisfy(row -> {
            assertThat(row.getIsClassified()).isTrue();
            assertThat(row.getFoundation().spendingEligible()).isTrue();
        });
        Long autoId = result.added().get(2).getId();
        assertThat(transactionService.patchCategory(autoId, educationId, userId).getCategoryId())
                .isEqualTo(educationId);
        assertThat(transactionService.addBulk(List.of(importRow("맥도날드", null)), userId).skippedCount())
                .isEqualTo(1);
        assertThat(transactionService.findById(autoId, userId).getCategoryId()).isEqualTo(educationId);
    }

    private TransactionDto importRow(String merchant, Long categoryId) {
        return TransactionDto.builder().transactionDate("2026-09-01").merchant(merchant)
                .categoryId(categoryId).amount(1000L).cardName("테스트카드").installment(1).status("승인").build();
    }

    @Test
    void organizeUpdates_PreserveHiddenTagsAndUseActualRuleId() {
        Long userId = createUser("organize-preservation", "보존유저");
        Long foodId = categoryId("식음료");
        Long transactionId = insertTransaction(userId, "2026-09-01", "스타벅스 보존", null, 1000L, "legacy raw tag", false);
        ruleService.create(userId, "스타벅스", foodId, null);
        TransactionDto applied = transactionService.findById(transactionId, userId);
        assertThat(applied.getTag()).isEqualTo("legacy raw tag");
        assertThat(applied.getFoundation().appliedRuleId()).isEqualTo(ruleId(userId, "스타벅스"));
        assertThat(applied.getFoundation().persisted()).isTrue();
        assertThat(applied.getFoundation().classification()).isEqualTo(cop.kbds.agilemvp.transaction.service.Classification.CLASSIFIED);

        TransactionDto unrelatedUpdate = TransactionDto.builder().transactionDate("2026-09-01")
                .merchant("스타벅스 보존").categoryId(foodId).amount(1000L).cardName("테스트카드")
                .installment(1).status("승인").memo("메모 수정").build();
        TransactionDto updated = transactionService.update(transactionId, unrelatedUpdate, userId);
        assertThat(updated.getTag()).isEqualTo("legacy raw tag");
        assertThat(updated.getAppliedRuleId()).isEqualTo(applied.getAppliedRuleId());

        TransactionDto manual = transactionService.patchCategory(transactionId, categoryId("쇼핑"), userId);
        assertThat(manual.getTag()).isEqualTo("legacy raw tag");
        assertThat(manual.getFoundation().appliedRuleId()).isNull();
    }

    @Test
    void categoryLifecycle_PreservesIdentityAndDoesNotReconnectByName() {
        Long userId = createUser("organize-lifecycle", "생명주기유저");
        Long categoryId = createCategory(userId, "식음료");
        Long transactionId = insertTransaction(userId, "2026-09-01", "원본 이용처", categoryId, 1000L, "legacy", true);
        categoryService.update(categoryId, userId, "이름 변경", "#123456");
        TransactionDto renamed = transactionService.findById(transactionId, userId);
        assertThat(renamed.getFoundation().categoryId()).isEqualTo(categoryId);
        assertThat(renamed.getFoundation().categoryLabel()).isEqualTo("이름 변경");
        categoryService.delete(categoryId, userId);
        createCategory(userId, "이름 변경");
        TransactionDto detached = transactionService.findById(transactionId, userId);
        assertThat(detached.getFoundation().categoryId()).isNull();
        assertThat(detached.getFoundation().classification()).isEqualTo(cop.kbds.agilemvp.transaction.service.Classification.UNCLASSIFIED);
        assertThat(detached.getTag()).isEqualTo("legacy");
        assertThat(detached.getFoundation().spendingEligible()).isTrue();
    }

    private Long createUser(String loginId, String nickname) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO users (login_id, nickname, password_hash)
                    VALUES (?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, loginId);
            ps.setString(2, nickname);
            ps.setString(3, "{noop}password");
            return ps;
        }, keyHolder);
        return generatedId(keyHolder);
    }

    private Long categoryId(String name) {
        return jdbcTemplate.queryForObject("SELECT id FROM categories WHERE name = ?", Long.class, name);
    }

    private Long createCategory(Long userId, String name) {
        categoryService.create(userId, name, "#123456");
        return jdbcTemplate.queryForObject(
                "SELECT id FROM categories WHERE user_id = ? AND name = ?",
                Long.class, userId, name);
    }

    private Long ruleId(Long userId, String keyword) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM mapping_rules WHERE user_id = ? AND keyword = ?",
                Long.class, userId, keyword);
    }

    private Long insertTransaction(Long userId, String date, String merchant, Long categoryId,
                                   Long amount, String tag, boolean isClassified) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement("""
                    INSERT INTO transactions
                        (user_id, transaction_date, merchant, category_id, amount, card_name,
                         installment, status, tag, is_classified)
                    VALUES (?, CAST(? AS DATE), ?, ?, ?, ?, 1, '승인', ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, date);
            ps.setString(3, merchant);
            if (categoryId == null) {
                ps.setObject(4, null);
            } else {
                ps.setLong(4, categoryId);
            }
            ps.setLong(5, amount);
            ps.setString(6, "테스트카드");
            ps.setString(7, tag);
            ps.setBoolean(8, isClassified);
            return ps;
        }, keyHolder);
        return generatedId(keyHolder);
    }

    private Long generatedId(KeyHolder keyHolder) {
        Map<String, Object> keys = keyHolder.getKeyList().get(0);
        Object id = keys.getOrDefault("id", keys.get("ID"));
        return ((Number) id).longValue();
    }

    private MockMultipartFile templateExcelFile(String categoryName) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("카드이용내역");
            Row header = sheet.createRow(0);
            String[] headers = {"날짜", "가맹점명", "카테고리", "금액", "카드명", "할부개월", "상태"};
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("2026-07-02");
            row.createCell(1).setCellValue("동물병원");
            row.createCell(2).setCellValue(categoryName);
            row.createCell(3).setCellValue(30000);
            row.createCell(4).setCellValue("테스트카드");
            row.createCell(5).setCellValue(1);
            row.createCell(6).setCellValue("승인");
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "template.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    private MockMultipartFile shinhanExcelFile() throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("신한카드");
            Row header = sheet.createRow(0);
            String[] headers = {"거래일", "가맹점명", "금액", "이용구분", "취소상태"};
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("2026.07.03 10:30:00");
            row.createCell(1).setCellValue("스타벅스 강남점");
            row.createCell(2).setCellValue(6200);
            row.createCell(3).setCellValue("일시불");
            row.createCell(4).setCellValue("");
            workbook.write(out);
            return new MockMultipartFile(
                    "file",
                    "shinhan.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    out.toByteArray());
        }
    }

    private Map<String, Object> transaction(Long id) {
        return jdbcTemplate.queryForMap("""
                SELECT category_id, tag, is_classified, applied_rule_id
                FROM transactions
                WHERE id = ?
                """, id);
    }
}
