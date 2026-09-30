package cop.kbds.agilemvp.transaction.service;

public enum Classification {
    CLASSIFIED, UNCLASSIFIED, INCONSISTENT;

    public static Classification from(Long categoryId, boolean categoryAvailable, Boolean flag) {
        if (categoryId == null && Boolean.FALSE.equals(flag)) return UNCLASSIFIED;
        if (categoryId != null && categoryAvailable && Boolean.TRUE.equals(flag)) return CLASSIFIED;
        return INCONSISTENT;
    }
}
