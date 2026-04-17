package cop.kbds.agilemvp.sample.controller;

import cop.kbds.agilemvp.sample.service.Sample;

public record SampleResponse(String message) {

    public static SampleResponse from(Sample vo, String name) {
        if (vo == null) {
            return null;
        }
        String prefix = (name != null && !name.trim().isEmpty()) ? name + "님, " : "";
        return new SampleResponse(prefix + vo.getFormattedMessage());
    }
}
