package cop.kbds.agilemvp.transaction.controller;

import cop.kbds.agilemvp.transaction.service.TransactionFoundation;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDto {
    private Long    id;
    private Long    userId;
    private String  transactionDate;
    private String  merchant;
    private Long    categoryId;
    private String  categoryName;
    private Long    amount;
    private String  cardName;
    private Integer installment;
    private String  status;
    private String  memo;
    private String  tag;
    @JsonIgnore
    private boolean tagSpecified;

    @JsonSetter("tag")
    public void setTag(String tag) {
        this.tag = tag;
        this.tagSpecified = true;
    }

    private Boolean isClassified;
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long appliedRuleId;
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private boolean persisted;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public TransactionFoundation getFoundation() {
        return TransactionFoundation.from(id, transactionDate, amount, status, categoryId,
                categoryName, isClassified, merchant, appliedRuleId, persisted);
    }
}
