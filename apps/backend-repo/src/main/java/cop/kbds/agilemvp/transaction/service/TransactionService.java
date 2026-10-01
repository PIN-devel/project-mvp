package cop.kbds.agilemvp.transaction.service;

import cop.kbds.agilemvp.category.repository.CategoryRepository;
import cop.kbds.agilemvp.category.service.CategoryClassifier;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import cop.kbds.agilemvp.common.util.SqlLikeUtil;
import cop.kbds.agilemvp.common.util.TagUtil;
import cop.kbds.agilemvp.rule.repository.RuleRepository;
import cop.kbds.agilemvp.rule.service.Rule;
import cop.kbds.agilemvp.transaction.controller.BulkUploadResult;
import cop.kbds.agilemvp.transaction.controller.TransactionDto;
import cop.kbds.agilemvp.transaction.controller.TransactionPageResult;
import cop.kbds.agilemvp.transaction.controller.TransactionSearchDto;
import cop.kbds.agilemvp.transaction.controller.TransactionSummaryDto;
import cop.kbds.agilemvp.transaction.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TransactionService {

    static final String MANUAL_CATEGORY_TAG = "#개별세척";

    private final TransactionRepository transactionRepository;
    private final CategoryRepository    categoryRepository;
    private final RuleRepository        ruleRepository;
    private final CategoryClassifier    categoryClassifier;

    public TransactionService(TransactionRepository transactionRepository,
                              CategoryRepository categoryRepository,
                              RuleRepository ruleRepository,
                              CategoryClassifier categoryClassifier) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository    = categoryRepository;
        this.ruleRepository        = ruleRepository;
        this.categoryClassifier    = categoryClassifier;
    }

    public List<TransactionDto> findAll(Long userId) {
        return transactionRepository.findAll(userId);
    }

    public TransactionPageResult search(TransactionSearchDto params) {
        List<TransactionDto> data     = transactionRepository.searchList(params);
        TransactionSummaryDto summary = transactionRepository.searchSummary(params);
        boolean hasMore = data.size() == params.getSize();
        return new TransactionPageResult(
                summary.getTotalCount(),
                summary.getApprovedCount(),
                summary.getCancelledCount(),
                summary.getTotalAmount(),
                hasMore,
                data
        );
    }

    public TransactionSummaryDto summary(TransactionSearchDto params) {
        return transactionRepository.searchSummary(params);
    }

    public TransactionDto findById(Long id, Long userId) {
        TransactionDto dto = transactionRepository.findById(id);
        if (dto == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        if (!dto.getUserId().equals(userId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        return dto;
    }

    public TransactionDto add(TransactionDto dto, Long userId) {
        dto.setUserId(userId);
        resolveCategoryId(dto, userId);
        dto.setTag(TagUtil.normalize(dto.getTag()));
        syncClassifiedFlag(dto);
        transactionRepository.insert(dto);
        return transactionRepository.findById(dto.getId());
    }

    @Transactional
    public BulkUploadResult addBulk(List<TransactionDto> list, Long userId) {
        Map<String, Long> catMap = buildCategoryMap(userId);
        List<TransactionDto> added = new java.util.ArrayList<>();
        int skippedCount = 0;
        for (TransactionDto dto : list) {
            dto.setUserId(userId);
            if (dto.getCategoryId() != null
                    && categoryRepository.findByIdAvailable(dto.getCategoryId(), userId) == null) {
                skippedCount++;
                continue;
            }
            if (dto.getCategoryId() == null && dto.getCategoryName() != null) {
                dto.setCategoryId(catMap.getOrDefault(dto.getCategoryName(), catMap.getOrDefault("기타", null)));
            }
            dto.setTag(TagUtil.normalize(dto.getTag()));
            syncClassifiedFlag(dto);
            if (transactionRepository.insertIgnoreDuplicate(dto)) {
                added.add(dto);
            } else {
                skippedCount++;
            }
        }
        applyExistingRulesToNewTransactions(userId, added);
        List<TransactionDto> unclassified = added.stream()
                .map(dto -> transactionRepository.findById(dto.getId()))
                .filter(dto -> dto.getCategoryId() == null)
                .toList();
        if (!unclassified.isEmpty()) {
            // Only canonical default categories are eligible for machine classification.
            Map<String, Long> defaults = new HashMap<>();
            categoryRepository.findAllAvailable(userId).stream()
                    .filter(category -> Boolean.TRUE.equals(category.getIsDefault()))
                    .forEach(category -> defaults.put(category.getName(), category.getId()));
            Map<String, String> classified = categoryClassifier.classify(
                    unclassified.stream().map(TransactionDto::getMerchant).toList());
            for (TransactionDto dto : unclassified) {
                Long categoryId = defaults.get(classified.getOrDefault(dto.getMerchant(), "기타"));
                if (categoryId == null) categoryId = defaults.get("기타");
                if (categoryId != null) transactionRepository.updateCategory(dto.getId(), categoryId, dto.getTag());
            }
        }
        List<TransactionDto> refreshed = added.stream()
                .map(dto -> transactionRepository.findById(dto.getId()))
                .toList();
        return new BulkUploadResult(refreshed, skippedCount);
    }

    @Transactional
    public TransactionDto update(Long id, TransactionDto dto, Long userId) {
        TransactionDto existing = transactionRepository.findById(id);
        if (existing == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        dto.setId(id);
        dto.setUserId(userId);
        resolveCategoryId(dto, userId);
        // A hidden/unchanged tag must survive an unrelated PUT, including legacy formatting.
        if ((!dto.isTagSpecified() && dto.getTag() == null) || java.util.Objects.equals(dto.getTag(), existing.getTag())) {
            dto.setTag(existing.getTag());
        } else {
            dto.setTag(TagUtil.normalize(dto.getTag()));
        }
        dto.setAppliedRuleId(java.util.Objects.equals(dto.getCategoryId(), existing.getCategoryId())
                ? existing.getAppliedRuleId() : null);
        syncClassifiedFlag(dto);
        transactionRepository.update(dto);
        return transactionRepository.findById(id);
    }

    public TransactionDto patchCategory(Long id, Long categoryId, Long userId) {
        TransactionDto existing = transactionRepository.findById(id);
        if (existing == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        if (categoryRepository.findByIdAvailable(categoryId, userId) == null) {
            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        }
        transactionRepository.updateCategory(id, categoryId, existing.getTag());
        return transactionRepository.findById(id);
    }

    public TransactionDto patchTag(Long id, String tag, Long userId) {
        TransactionDto existing = transactionRepository.findById(id);
        if (existing == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        transactionRepository.updateTag(id, TagUtil.normalize(tag));
        return transactionRepository.findById(id);
    }

    public void delete(Long id, Long userId) {
        TransactionDto existing = transactionRepository.findById(id);
        if (existing == null) throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) throw new BusinessException(CommonErrorCode.FORBIDDEN);
        transactionRepository.delete(id);
    }

    @Transactional
    public void deleteAll(Long userId) {
        transactionRepository.deleteAll(userId);
    }

    @Transactional
    public List<TransactionDto> reset(Long userId) {
        transactionRepository.deleteAll(userId);
        insertDefaults(userId);
        return transactionRepository.findAll(userId);
    }

    private void resolveCategoryId(TransactionDto dto, Long userId) {
        if (dto.getCategoryId() != null
                && categoryRepository.findByIdAvailable(dto.getCategoryId(), userId) == null) {
            throw new BusinessException(CommonErrorCode.ENTITY_NOT_FOUND);
        }
        if (dto.getCategoryId() == null && dto.getCategoryName() != null) {
            Map<String, Long> catMap = buildCategoryMap(userId);
            dto.setCategoryId(catMap.getOrDefault(dto.getCategoryName(), catMap.getOrDefault("기타", null)));
        }
    }

    private Map<String, Long> buildCategoryMap(Long userId) {
        Map<String, Long> map = new HashMap<>();
        categoryRepository.findAllAvailable(userId).forEach(c -> map.put(c.getName(), c.getId()));
        return map;
    }

    private void syncClassifiedFlag(TransactionDto dto) {
        dto.setIsClassified(dto.getCategoryId() != null);
    }

    private void applyExistingRulesToNewTransactions(Long userId, List<TransactionDto> added) {
        List<Long> transactionIds = added.stream()
                .map(TransactionDto::getId)
                .toList();
        if (transactionIds.isEmpty()) return;

        for (Rule rule : ruleRepository.findAllByUserId(userId)) {
            ruleRepository.applyRuleToTransactions(
                    userId,
                    rule.getId(),
                    SqlLikeUtil.escape(rule.getKeyword()),
                    rule.getCategoryId(),
                    rule.getTag(),
                    transactionIds
            );
        }
    }

    private void insertDefaults(Long userId) {
        Map<String, Long> cat = buildCategoryMap(userId);
        Object[][] rows = {
            {"2026-01-02", "스타벅스",   "식음료",    6500L, "신한카드", 1, "승인"},
            {"2026-01-03", "쿠팡",       "쇼핑",     38900L, "국민카드", 1, "승인"},
            {"2026-01-05", "카카오택시", "교통",     12300L, "삼성카드", 1, "승인"},
            {"2026-01-06", "맥도날드",   "식음료",    9800L, "신한카드", 1, "승인"},
            {"2026-01-07", "CU",         "편의점",    3200L, "현대카드", 1, "승인"},
            {"2026-01-08", "넷플릭스",   "문화/여가", 17000L, "국민카드", 1, "승인"},
            {"2026-01-09", "SKT",        "통신",     55000L, "신한카드", 1, "승인"},
            {"2026-01-10", "배달의민족", "식음료",   24500L, "삼성카드", 1, "승인"},
            {"2026-01-11", "이마트",     "쇼핑",     67300L, "현대카드", 1, "승인"},
            {"2026-01-12", "SK에너지",   "주유",     89000L, "우리카드", 1, "승인"},
        };
        for (Object[] r : rows) {
            transactionRepository.insert(TransactionDto.builder()
                .userId(userId)
                .transactionDate((String)  r[0])
                .merchant(       (String)  r[1])
                .categoryId(cat.getOrDefault((String) r[2], cat.getOrDefault("기타", null)))
                .amount(         (Long)    r[3])
                .cardName(       (String)  r[4])
                .installment(    (Integer) r[5])
                .status(         (String)  r[6])
                .build());
        }
    }
}
