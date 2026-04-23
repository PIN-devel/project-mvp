package cop.kbds.agilemvp.common.util;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.SequencedCollection;

/**
 * 모던 자바(Java 25) 기능을 활용한 컬렉션 유틸리티
 */
public final class CollectionUtil {

    private CollectionUtil() {
        throw new UnsupportedOperationException("Utility class");
    }

    /**
     * 컬렉션이 null이거나 비어있는지 확인
     */
    public static boolean isEmpty(Collection<?> collection) {
        return collection == null || collection.isEmpty();
    }

    /**
     * 컬렉션이 비어있지 않은지 확인
     */
    public static boolean isNotEmpty(Collection<?> collection) {
        return !isEmpty(collection);
    }

    /**
     * null-safe한 리스트 반환
     */
    public static <T> List<T> emptyIfNull(List<T> list) {
        return list == null ? Collections.emptyList() : list;
    }

    /**
     * null-safe한 맵 반환
     */
    public static <K, V> Map<K, V> emptyIfNull(Map<K, V> map) {
        return map == null ? Collections.emptyMap() : map;
    }

    /**
     * SequencedCollection의 첫 번째 요소 가져오기 (Java 21+)
     */
    public static <T> T getFirst(SequencedCollection<T> collection) {
        if (isEmpty(collection)) {
            throw new IllegalArgumentException("컬렉션이 비어있습니다.");
        }
        return collection.getFirst();
    }

    /**
     * SequencedCollection의 마지막 요소 가져오기 (Java 21+)
     */
    public static <T> T getLast(SequencedCollection<T> collection) {
        if (isEmpty(collection)) {
            throw new IllegalArgumentException("컬렉션이 비어있습니다.");
        }
        return collection.getLast();
    }

    /**
     * 리스트에서 null 요소를 제거한 새로운 리스트 반환
     */
    public static <T> List<T> filterNonNull(List<T> list) {
        if (list == null)
            return Collections.emptyList();
        return list.stream().filter(Objects::nonNull).toList();
    }
}
