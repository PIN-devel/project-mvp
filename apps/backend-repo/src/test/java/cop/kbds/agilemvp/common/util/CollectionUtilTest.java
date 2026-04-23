package cop.kbds.agilemvp.common.util;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CollectionUtilTest {

    @Test
    @DisplayName("컬렉션 비어임 여부를 확인한다")
    void isEmptyTest() {
        assertThat(CollectionUtil.isEmpty(null)).isTrue();
        assertThat(CollectionUtil.isEmpty(List.of())).isTrue();
        assertThat(CollectionUtil.isEmpty(List.of(1))).isFalse();
    }

    @Test
    @DisplayName("null일 경우 빈 리스트를 반환한다")
    void emptyIfNullTest() {
        assertThat(CollectionUtil.emptyIfNull((List<Object>) null)).isEmpty();
        assertThat(CollectionUtil.emptyIfNull(List.of(1))).hasSize(1);
    }

    @Test
    @DisplayName("SequencedCollection의 첫 번째와 마지막 요소를 가져온다")
    void sequencedCollectionTest() {
        List<Integer> list = List.of(1, 2, 3);
        assertThat(CollectionUtil.getFirst(list)).isEqualTo(1);
        assertThat(CollectionUtil.getLast(list)).isEqualTo(3);
    }

    @Test
    @DisplayName("빈 리스트에서 요소를 가져오려 할 때 예외를 던진다")
    void sequencedCollectionExceptionTest() {
        assertThatThrownBy(() -> CollectionUtil.getFirst(List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("리스트에서 null 요소를 필터링한다")
    void filterNonNullTest() {
        List<String> list = Arrays.asList("a", null, "b");
        List<String> result = CollectionUtil.filterNonNull(list);
        assertThat(result).containsExactly("a", "b");
    }
}
