package cop.kbds.agilemvp.sample;

public record SampleResponseDTO(String message) {

    public static SampleResponseDTO from(SampleVO vo, String name) {
        if (vo == null) {
            return null;
        }
        String prefix = (name != null && !name.trim().isEmpty()) ? name + "님, " : "";
        return new SampleResponseDTO(prefix + vo.message());
    }
}
