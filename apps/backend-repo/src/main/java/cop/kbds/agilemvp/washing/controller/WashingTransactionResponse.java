package cop.kbds.agilemvp.washing.controller;

import cop.kbds.agilemvp.transaction.controller.TransactionDto;
import cop.kbds.agilemvp.transaction.service.TransactionFoundation;

public record WashingTransactionResponse(
        Long id,
        String occurredAt,
        String merchantName,
        String description,
        String cardLabel,
        Long amount,
        String category,
        Boolean isClassified,
        String matchedRuleLabel,
        String tag,
        String source,
        TransactionFoundation foundation
) {
    public static WashingTransactionResponse from(TransactionDto transaction) {
        String tag = transaction.getTag() == null ? "" : transaction.getTag();
        return new WashingTransactionResponse(
                transaction.getId(),
                transaction.getTransactionDate(),
                transaction.getMerchant(),
                transaction.getMemo() == null ? "" : transaction.getMemo(),
                transaction.getCardName(),
                transaction.getAmount(),
                transaction.getCategoryName(),
                Boolean.TRUE.equals(transaction.getIsClassified()),
                transaction.getAppliedRuleId() == null ? null : "규칙 #" + transaction.getAppliedRuleId(),
                tag,
                "CARD",
                transaction.getFoundation()
        );
    }
}
