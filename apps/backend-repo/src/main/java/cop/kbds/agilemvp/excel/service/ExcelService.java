package cop.kbds.agilemvp.excel.service;

import cop.kbds.agilemvp.category.repository.CategoryRepository;
import cop.kbds.agilemvp.common.exception.BusinessException;
import cop.kbds.agilemvp.common.exception.CommonErrorCode;
import cop.kbds.agilemvp.transaction.controller.TransactionDto;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExcelService {

    private final CategoryRepository categoryRepository;

    private static final String[] HEADERS = {"날짜", "가맹점명", "카테고리", "금액", "카드명", "할부개월", "상태"};
    private static final List<String> VALID_STATUSES = List.of("승인", "취소");

    private Set<String> loadValidCategories(Long userId) {
        return categoryRepository.findAllAvailable(userId).stream()
                .map(c -> c.getName())
                .collect(Collectors.toSet());
    }

    private enum BankType { SHINHAN, KB, TEMPLATE, UNKNOWN }

    private BankType detectBankType(Workbook wb) {
        Sheet sheet = wb.getSheetAt(0);
        for (int r = 0; r < Math.min(10, sheet.getLastRowNum() + 1); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            Set<String> cells = new HashSet<>();
            for (int c = 0; c < row.getLastCellNum(); c++) {
                String val = getCellString(row, c).replaceAll("\\s+", "").toLowerCase();
                cells.add(val);
            }
            if (cells.contains("거래일") && cells.contains("취소상태"))  return BankType.SHINHAN;
            if (cells.contains("이용하신곳") && cells.contains("이용일")) return BankType.KB;
            if (cells.contains("날짜") && cells.contains("카테고리"))    return BankType.TEMPLATE;
        }
        return BankType.UNKNOWN;
    }

    private List<TransactionDto> parseShinhancardFormat(Workbook wb) {
        Sheet sheet = wb.getSheetAt(0);
        Row headerRow = findHeaderRow(sheet, "거래일");
        if (headerRow == null) throw new BusinessException(CommonErrorCode.INVALID_INPUT, "[신한카드] 헤더 행을 찾을 수 없습니다.");

        Map<String, Integer> ci = buildColIndex(headerRow);
        List<TransactionDto> result = new ArrayList<>();
        long tempId = 1;

        for (int r = headerRow.getRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String rawDate = getCellString(row, ci.get("거래일"));
            if (rawDate.isBlank()) continue;
            String date = rawDate.substring(0, 10).replace(".", "-");
            String merchant   = getCellString(row, ci.getOrDefault("가맹점명", -1));
            long   amount     = Math.abs(getCellLong(row, ci.getOrDefault("금액", -1)));
            String issueType  = getCellString(row, ci.getOrDefault("이용구분", -1));
            String cancelFlag = getCellString(row, ci.getOrDefault("취소상태", -1));
            int installment = parseInstallmentShinhan(issueType);
            String status   = cancelFlag.isBlank() ? "승인" : "취소";
            result.add(TransactionDto.builder()
                    .id(tempId++).transactionDate(date).merchant(merchant)
                    // Preview stays unclassified; saved imports apply user rules before automatic classification.
                    .amount(amount).cardName("신한카드")
                    .installment(installment).status(status)
                    .build());
        }
        return result;
    }

    private int parseInstallmentShinhan(String issueType) {
        if (issueType == null || issueType.isBlank() || issueType.contains("일시불")) return 1;
        Matcher m = Pattern.compile("(\\d+)").matcher(issueType);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    private List<TransactionDto> parseKbFormat(Workbook wb) {
        Sheet sheet = wb.getSheetAt(0);
        Row headerRow = findHeaderRow(sheet, "이용하신곳");
        if (headerRow == null) throw new BusinessException(CommonErrorCode.INVALID_INPUT, "[KB국민카드] 헤더 행을 찾을 수 없습니다.");

        Map<String, Integer> ci = buildColIndex(headerRow);
        List<TransactionDto> result = new ArrayList<>();
        long tempId = 1;

        for (int r = headerRow.getRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String date = getCellString(row, ci.getOrDefault("이용일", -1));
            if (date.isBlank()) continue;
            String merchant    = getCellString(row, ci.getOrDefault("이용하신곳", -1));
            long   amount      = Math.abs(getCellLong(row, ci.getOrDefault("국내이용금액(원)", -1)));
            String payMethod   = getCellString(row, ci.getOrDefault("결제방법", -1));
            String statusRaw   = getCellString(row, ci.getOrDefault("상태", -1));
            int    installment = parseInstallmentKb(payMethod);
            String status      = statusRaw; // Preserve unknown source values; normalization belongs to TransactionFoundation.
            result.add(TransactionDto.builder()
                    .id(tempId++).transactionDate(date).merchant(merchant)
                    // Preview stays unclassified; saved imports apply user rules before automatic classification.
                    .amount(amount).cardName("국민카드")
                    .installment(installment).status(status)
                    .build());
        }
        return result;
    }

    private int parseInstallmentKb(String payMethod) {
        if (payMethod == null || payMethod.isBlank() || payMethod.contains("일시불") || payMethod.contains("포인트")) return 1;
        Matcher m = Pattern.compile("(\\d+)").matcher(payMethod);
        return m.find() ? Integer.parseInt(m.group(1)) : 1;
    }

    private List<TransactionDto> parseTemplateFormat(Workbook wb, Long userId) {
        Sheet sheet = wb.getSheetAt(0);
        Row headerRow = sheet.getRow(0);
        if (headerRow == null) throw new BusinessException(CommonErrorCode.INVALID_INPUT, "엑셀 헤더가 없습니다.");

        Map<String, Integer> ci = buildColIndex(headerRow);
        List<String> missing = new ArrayList<>();
        for (String h : HEADERS) if (!ci.containsKey(h)) missing.add(h);
        if (!missing.isEmpty()) throw new BusinessException(CommonErrorCode.INVALID_INPUT, "컬럼 누락: " + String.join(", ", missing));

        Set<String> validCategories = loadValidCategories(userId);
        List<TransactionDto> result = new ArrayList<>();
        long tempId = 1;

        for (int r = 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String date = getCellString(row, ci.get("날짜"));
            if (date.isBlank()) continue;
            String merchant    = getCellString(row, ci.get("가맹점명"));
            String category    = getCellString(row, ci.get("카테고리"));
            long   amount      = getCellLong(row,   ci.get("금액"));
            String card        = getCellString(row, ci.get("카드명"));
            int    installment = (int) getCellLong(row, ci.get("할부개월"));
            String status      = getCellString(row, ci.get("상태"));
            if (!date.matches("\\d{4}-\\d{2}-\\d{2}"))
                throw new BusinessException(CommonErrorCode.INVALID_INPUT, (r + 1) + "행: 날짜 형식 오류 (YYYY-MM-DD)");
            if (!validCategories.contains(category))
                throw new BusinessException(CommonErrorCode.INVALID_INPUT, (r + 1) + "행: 유효하지 않은 카테고리 '" + category + "'");
            if (!VALID_STATUSES.contains(status))
                throw new BusinessException(CommonErrorCode.INVALID_INPUT, (r + 1) + "행: 상태는 '승인' 또는 '취소'여야 합니다.");
            result.add(TransactionDto.builder()
                    .id(tempId++).transactionDate(date).merchant(merchant).categoryName(category)
                    .amount(amount).cardName(card)
                    .installment(installment == 0 ? 1 : installment)
                    .status(status).build());
        }
        return result;
    }

    public List<TransactionDto> parseUpload(MultipartFile file, Long userId) {
        try (Workbook wb = WorkbookFactory.create(file.getInputStream())) {
            BankType bankType = detectBankType(wb);
            List<TransactionDto> parsed = switch (bankType) {
                case SHINHAN  -> parseShinhancardFormat(wb);
                case KB       -> parseKbFormat(wb);
                case TEMPLATE -> parseTemplateFormat(wb, userId);
                case UNKNOWN  -> throw new BusinessException(CommonErrorCode.INVALID_INPUT,
                        "지원하지 않는 엑셀 형식입니다. 신한카드 / KB국민카드 / 서비스 양식 파일만 업로드 가능합니다.");
            };
            normalizePreviewTransactions(parsed, userId);
            return parsed;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT, "파일을 읽을 수 없습니다: " + e.getMessage());
        }
    }

    private void normalizePreviewTransactions(List<TransactionDto> transactions, Long userId) {
        for (TransactionDto transaction : transactions) {
            transaction.setUserId(userId);
            boolean hasCategory = transaction.getCategoryId() != null
                    || (transaction.getCategoryName() != null && !transaction.getCategoryName().isBlank());
            transaction.setIsClassified(hasCategory);
        }
    }

    public byte[] generateTemplate() throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("카드이용내역");
            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle sampleStyle = createSampleStyle(wb);
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }
            Object[][] sampleRows = {
                    {"2026-04-01", "스타벅스",    "식음료",    6500L,  "신한카드", 1, "승인"},
                    {"2026-04-02", "쿠팡",        "쇼핑",     38900L,  "국민카드", 1, "승인"},
                    {"2026-04-03", "카카오택시",  "교통",      8700L,  "삼성카드", 1, "승인"},
                    {"2026-04-04", "세브란스병원","의료/건강", 35000L,  "국민카드", 1, "승인"},
                    {"2026-04-05", "CGV",         "문화/여가", 14000L, "신한카드", 1, "승인"},
            };
            for (int r = 0; r < sampleRows.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < sampleRows[r].length; c++) {
                    Cell cell = row.createCell(c);
                    cell.setCellStyle(sampleStyle);
                    Object val = sampleRows[r][c];
                    if (val instanceof Number) cell.setCellValue(((Number) val).doubleValue());
                    else cell.setCellValue(val.toString());
                }
            }
            int[] colWidths = {3500, 5000, 3500, 3000, 3500, 3000, 2500};
            for (int i = 0; i < colWidths.length; i++) sheet.setColumnWidth(i, colWidths[i]);
            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportToExcel(List<TransactionDto> transactions) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("카드이용내역");
            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle dataStyle   = createDataStyle(wb);
            CellStyle amountStyle = createAmountStyle(wb);
            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }
            for (int r = 0; r < transactions.size(); r++) {
                TransactionDto t = transactions.get(r);
                Row row = sheet.createRow(r + 1);
                setCell(row, 0, t.getTransactionDate(), dataStyle);
                setCell(row, 1, t.getMerchant(),        dataStyle);
                setCell(row, 2, t.getCategoryName(),    dataStyle);
                Cell amt = row.createCell(3);
                amt.setCellValue(t.getAmount()); amt.setCellStyle(amountStyle);
                setCell(row, 4, t.getCardName(), dataStyle);
                Cell inst = row.createCell(5);
                inst.setCellValue(t.getInstallment()); inst.setCellStyle(dataStyle);
                setCell(row, 6, t.getStatus(), dataStyle);
            }
            int[] colWidths = {3500, 5000, 3500, 3500, 3500, 3000, 2500};
            for (int i = 0; i < colWidths.length; i++) sheet.setColumnWidth(i, colWidths[i]);
            wb.write(out);
            return out.toByteArray();
        }
    }

    private Row findHeaderRow(Sheet sheet, String markerColumn) {
        for (int r = 0; r <= Math.min(10, sheet.getLastRowNum()); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            for (int c = 0; c < row.getLastCellNum(); c++) {
                if (getCellString(row, c).contains(markerColumn)) return row;
            }
        }
        return null;
    }

    private Map<String, Integer> buildColIndex(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (int c = 0; c < headerRow.getLastCellNum(); c++) {
            String key = getCellString(headerRow, c).replaceAll("\\s+", "").replaceAll("\n", "");
            if (!key.isBlank()) map.put(key, c);
        }
        return map;
    }

    private String getCellString(Row row, int colIdx) {
        if (colIdx < 0) return "";
        Cell cell = row.getCell(colIdx);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? new SimpleDateFormat("yyyy-MM-dd").format(cell.getDateCellValue())
                    : String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private long getCellLong(Row row, int colIdx) {
        if (colIdx < 0) return 0L;
        Cell cell = row.getCell(colIdx);
        if (cell == null) return 0L;
        return switch (cell.getCellType()) {
            case NUMERIC -> (long) cell.getNumericCellValue();
            case STRING  -> { try { yield Long.parseLong(cell.getStringCellValue().trim().replaceAll("[,\\s]", "")); } catch (NumberFormatException e) { yield 0L; } }
            default -> 0L;
        };
    }

    private void setCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        Font f = wb.createFont(); f.setBold(true); f.setColor(IndexedColors.WHITE.getIndex());
        s.setFont(f);
        s.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setAlignment(HorizontalAlignment.CENTER);
        s.setBorderBottom(BorderStyle.THIN);
        return s;
    }

    private CellStyle createDataStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setBorderBottom(BorderStyle.THIN); s.setBorderTop(BorderStyle.THIN);
        s.setBorderLeft(BorderStyle.THIN);   s.setBorderRight(BorderStyle.THIN);
        s.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        return s;
    }

    private CellStyle createAmountStyle(Workbook wb) {
        CellStyle s = createDataStyle(wb);
        s.setDataFormat(wb.createDataFormat().getFormat("#,##0"));
        s.setAlignment(HorizontalAlignment.RIGHT);
        return s;
    }

    private CellStyle createSampleStyle(Workbook wb) {
        CellStyle s = wb.createCellStyle();
        s.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        s.setBorderBottom(BorderStyle.THIN);
        return s;
    }
}
