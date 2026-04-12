package cop.kbds.agilemvp.sample;

public record SampleVO(String message) {

    public boolean isValid() {
        return message != null && !message.trim().isEmpty();
    }
}
