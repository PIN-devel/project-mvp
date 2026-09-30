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

    private static final List<String[]> CATEGORY_RULES = List.of(
        new String[]{"편의점",
            "GS25,세븐일레븐,7-eleven,CU편의점,씨유,이마트24,미니스톱,스토리웨이,바이더웨이," +
            "위드미,365플러스,더채움,로손,패밀리마트"},
        new String[]{"식음료",
            "스타벅스,투썸플레이스,이디야,빽다방,메가커피,메가mgc,컴포즈커피,파스쿠찌," +
            "할리스,탐앤탐스,엔젤리너스,커피빈,던킨,배스킨,베스킨,나뚜루,설빙," +
            "공차,버블티,쥬씨,쥬스,스무디킹,빙수,카페,커피숍," +
            "맥도날드,맥도,버거킹,롯데리아,kfc,서브웨이,맘스터치,파파이스,쉐이크쉑," +
            "노브랜드버거,빅쉑,파이브가이즈,웬디스,타코벨,치폴레," +
            "bbq,bhc,굽네치킨,교촌치킨,페리카나,네네치킨,처갓집,노랑통닭,호식이," +
            "피자헛,도미노,도미노피자,파파존스,피자알볼로,고피자,반올림피자,미스터피자," +
            "배달의민족,쿠팡이츠,요기요,배달특급,위메프오,땡겨요," +
            "한솥,본도시락,한솥도시락,도시락,김밥천국,김밥나라,이삭토스트,써브웨이," +
            "스시,초밥,라멘,라면,우동,소바,돈까스,돈가스,샤브샤브,삼겹살,고기집,구이," +
            "중국집,짜장,짬뽕,족발,보쌈,순대,국밥,해장국,설렁탕,갈비,냉면,만두," +
            "분식,떡볶이,순대국,순댓국,편의식,식당,음식점,레스토랑,밥집," +
            "파리바게뜨,뚜레쥬르,성심당,아우어베이커리,빵집,베이커리,케이크," +
            "신선청과,수산시장,정육점,슈퍼마켓,슈퍼,식자재,반찬"},
        new String[]{"쇼핑",
            "쿠팡,11번가,g마켓,gmarket,옥션,auction,위메프,티몬,인터파크,네이버쇼핑," +
            "카카오쇼핑,카카오선물,쿠페이,ssg닷컴,ssg.com,마켓컬리,컬리,오늘의집," +
            "무신사,29cm,에이블리,지그재그,브랜디,하이버," +
            "이마트,트레이더스,롯데마트,홈플러스,코스트코,costco,메가마트,농협하나로," +
            "롯데백화점,현대백화점,신세계백화점,갤러리아,AK플라자,NC백화점," +
            "올리브영,랄라블라,시코르,세포라,이니스프리,아리따움," +
            "유니클로,자라,zara,h&m,spao,탑텐,무신사스탠다드,나이키,아디다스,뉴발란스," +
            "abc마트,슈마커,폴리,자주,이케아,ikea," +
            "다이소,아성다이소,버터,핫트랙스,영풍문고,교보문고,yes24,알라딘,반디앤루니스," +
            "쿠팡로켓,로켓배송,위즈위드,쇼핑몰"},
        new String[]{"교통",
            "티머니,티-머니,한국스마트카드,교통카드,지하철,버스,서울교통공사,도시철도," +
            "한국철도,코레일,ktx,srt,무궁화,새마을,itx,레일플러스,기차," +
            "대한항공,아시아나,제주항공,진에어,에어부산,에어서울,티웨이,이스타,에어로k," +
            "에어프레미아,항공,공항리무진,공항버스," +
            "카카오택시,카카오t,우티,타다,아이엠택시,온다택시,반반택시,마카롱택시," +
            "택시,콜택시,대리운전,킥보드,씽씽,라임,빔,쏘카,그린카,렌터카,렌트카," +
            "고속버스,시외버스,usb,버스티켓,코버스,이비tickt,철도승차권,철도역"},
        new String[]{"의료/건강",
            "병원,의원,클리닉,의료,한의원,한방,치과,안과,피부과,성형외과,이비인후과," +
            "정형외과,내과,외과,산부인과,소아과,정신건강,신경과,비뇨기과,재활의학," +
            "세브란스,서울대병원,삼성의료원,아산병원,강남성심,강북삼성,건국대병원," +
            "약국,약방,드럭스토어,올리브영약국," +
            "헬스장,헬스클럽,피트니스,pt센터,크로스핏,필라테스,요가,수영장,골프," +
            "스포츠센터,구민체육관,건강식품,영양제,비타민,홍삼"},
        new String[]{"문화/여가",
            "cgv,롯데시네마,메가박스,씨네큐,영화관,영화티켓," +
            "넷플릭스,netflix,유튜브프리미엄,youtube,왓챠,웨이브,wave,티빙,tving," +
            "쿠팡플레이,시즌,애플tv,디즈니플러스,스포티파이,melon,멜론,지니뮤직,플로," +
            "스팀,steam,플레이스테이션,nintendo,닌텐도,xbox,넥슨,엔씨소프트,카카오게임," +
            "구글플레이,app store,앱스토어,게임,배틀넷," +
            "인터파크티켓,멜론티켓,예스24티켓,공연,뮤지컬,콘서트,연극,전시,박물관,미술관," +
            "야구,축구,농구,배구,스타디움,경기장,볼링,당구,pc방,노래방,코인노래,스크린골프," +
            "캠핑,낚시,등산,클라이밍,서핑,스키,스노우보드,찜질방,사우나,스파,워터파크," +
            "여행사,호텔,모텔,펜션,에어비앤비,airbnb,booking,야놀자,여기어때,goodchoice," +
            "제주도,해외여행,면세점,롯데면세,신라면세"},
        new String[]{"주유",
            "sk에너지,gs칼텍스,현대오일뱅크,s-oil,에쓰오일,오일뱅크,알뜰주유소," +
            "self주유,셀프주유,주유소,ex-oil,극동유,부광주유,하이오일,e1충전,ev충전," +
            "전기차충전,충전소,환경부충전,kepco충전,한전충전"},
        new String[]{"통신",
            "skt,sk텔레콤,kt,kt올레,lg유플러스,lgu+,lg u+,lguplus," +
            "알뜰폰,mvno,헬로모바일,kt엠모바일,sk세븐모바일,미디어로그," +
            "인터넷,유선전화,케이블tv,위성tv,sky life,skylife"},
        new String[]{"교육",
            "인프런,클래스101,유데미,udemy,coursera,코세라,패스트캠퍼스,에듀윌," +
            "해커스,메가스터디,이투스,엠베스트,sky에듀,시대인재,대성,종로학원," +
            "학원,교습소,어학원,영어학원,수학학원,코딩학원,음악학원,미술학원," +
            "어린이집,유치원,학교,대학교,대학원,도서관," +
            "교재,참고서,문제집,yes24,알라딘,교보문고,영풍문고,반디앤루니스,강의,교육"},
        new String[]{"기타",
            "국민건강보험,건강보험,국민연금,고용보험,산재보험,세금,부가세,소득세," +
            "아파트관리비,관리비,도시가스,한국전력,수도,수도요금,전기요금,가스요금," +
            "보험료,생명보험,손해보험,화재보험,자동차보험,삼성생명,한화생명,교보생명," +
            "신한은행,국민은행,우리은행,하나은행,농협,기업은행,카카오뱅크,토스,페이코," +
            "atm,이체수수료,대출,이자,카드연회비,페이,간편결제"}
    );

    private String classifyCategory(String merchant) {
        String m = merchant.toLowerCase();
        for (String[] rule : CATEGORY_RULES) {
            for (String kw : rule[1].split(",")) {
                if (m.contains(kw.toLowerCase())) return rule[0];
            }
        }
        return "기타";
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
                    // categoryName(classifyCategory(merchant)) was intentionally disabled.
                    // Card-company imports should remain unclassified until user rules classify them.
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
                    // categoryName(classifyCategory(merchant)) was intentionally disabled.
                    // Card-company imports should remain unclassified until user rules classify them.
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
