import { Container, Title, Text, Button, Stack, Group } from "@mantine/core";
import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <Container size="md" py={120}>
      <Stack align="center" gap="xl">
        <div style={{ position: "relative", textAlign: "center" }}>
          <Text
            fz={{ base: 120, sm: 220 }}
            fw={900}
            c="brandMint.0"
            style={{ lineHeight: 1, userSelect: "none" }}
          >
            404
          </Text>
          <Title
            order={1}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -20%)",
              width: "100%",
            }}
          >
            찾으시는 페이지가 없습니다.
          </Title>
        </div>

        <Stack align="center" gap="md">
          <Text c="dimmed" size="lg" ta="center" maw={500}>
            요청하신 페이지가 삭제되었거나, 주소가 변경되었을 수 있습니다.
            입력하신 주소를 다시 한번 확인해 주세요.
          </Text>
          
          <Group justify="center" mt="xl">
            <Button
              component={Link}
              to="/"
              size="lg"
              variant="filled"
              color="brandMint"
              radius="md"
            >
              메인 페이지로 돌아가기
            </Button>
            <Button
              onClick={() => window.history.back()}
              size="lg"
              variant="light"
              color="gray"
              radius="md"
            >
              이전 페이지로
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Container>
  );
}
