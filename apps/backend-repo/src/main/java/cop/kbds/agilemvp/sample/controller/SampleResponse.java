package cop.kbds.agilemvp.sample.controller;

import java.time.format.DateTimeFormatter;

import cop.kbds.agilemvp.sample.service.Sample;

/**
 * 도메인 모델(Sample)을 API 응답 규격에 맞게 변환하는 DTO입니다.
 * 필드 가공(기념일 계산, 날짜 포맷팅 등)이나 특정 필드 노출 제어 등의 용도로 사용됩니다.
 */
public record SampleResponse(
        Long id,
        String message,
        String status,
        boolean urgent,
        String updatedAt
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static SampleResponse from(Sample vo) {
        if (vo == null) {
            return null;
        }

        // 도메인 모델의 데이터를 클라이언트의 요구사항에 맞게 가공하여 전달합니다.
        return new SampleResponse(
                vo.getId(),
                vo.getMessage(),
                vo.getStatus(),
                vo.isUrgent(),
                vo.getUpdatedAt() != null ? vo.getUpdatedAt().format(FORMATTER) : null
        );
    }
}
