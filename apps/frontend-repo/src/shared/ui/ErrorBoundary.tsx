import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconHome2,
} from "@tabler/icons-react";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import {
  ProblemDetailSchema,
  type ProblemDetail,
} from "@/shared/model/problemDetail";

const DEFAULT_MESSAGE =
  "요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const parseProblemDetail = (value: unknown): ProblemDetail | null => {
  const parsed = ProblemDetailSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  if (typeof value === "string") {
    try {
      const json = JSON.parse(value) as unknown;
      const fromJson = ProblemDetailSchema.safeParse(json);
      return fromJson.success ? fromJson.data : null;
    } catch {
      return null;
    }
  }

  return null;
};

const getErrorMessage = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    const problem = parseProblemDetail(error.data);
    if (problem?.detail) {
      return problem.detail;
    }

    if (typeof error.data === "string" && error.data.trim() !== "") {
      const problemFromString = parseProblemDetail(error.data);
      if (problemFromString?.detail) {
        return problemFromString.detail;
      }

      return error.data;
    }

    return error.status === 404
      ? "요청한 정보를 찾을 수 없습니다."
      : DEFAULT_MESSAGE;
  }

  const problem = parseProblemDetail(error);
  if (problem?.detail) {
    return problem.detail;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return DEFAULT_MESSAGE;
};

export function ErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255, 214, 102, 0.28) 0%, rgba(255, 255, 255, 0) 42%), linear-gradient(180deg, #fff9ef 0%, #fffdf8 100%)",
      }}
    >
      <Container size="sm" py={{ base: 48, md: 96 }}>
        <Paper
          withBorder
          radius={28}
          p={{ base: "xl", md: "2.5rem" }}
          shadow="xl"
          style={{
            overflow: "hidden",
            borderColor: "rgba(210, 153, 34, 0.18)",
            background:
              "linear-gradient(180deg, rgba(255, 250, 240, 0.98) 0%, rgba(255, 255, 255, 1) 100%)",
          }}
        >
          <Stack gap="xl" align="center">
            <ThemeIcon
              size={84}
              radius="xl"
              color="orange"
              variant="light"
              style={{
                boxShadow: "0 18px 40px rgba(214, 140, 0, 0.16)",
              }}
            >
              <IconAlertTriangle size={42} />
            </ThemeIcon>

            <Stack gap={10} align="center">
              <Text
                size="sm"
                fw={800}
                tt="uppercase"
                c="orange.8"
                style={{ letterSpacing: "0.12em" }}
              >
                Error Notice
              </Text>
              <Title order={1} ta="center">
                요청을 완료하지 못했어요
              </Title>
              <Text c="dimmed" ta="center" maw={460} lh={1.6}>
                문제가 된 기술 정보는 숨기고, 필요한 안내만 보여드리고 있어요.
                아래 메시지를 확인한 뒤 다시 시도해 주세요.
              </Text>
            </Stack>

            <Alert color="orange" radius="xl" variant="light" w="100%" p="lg">
              <Stack gap={6} align="center">
                <Text size="sm" c="dimmed" fw={600}>
                  안내 메시지
                </Text>
                <Text fw={700} ta="center" size="lg">
                  {message}
                </Text>
              </Stack>
            </Alert>

            <Group justify="center">
              <Button
                variant="default"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => window.history.back()}
              >
                이전 페이지
              </Button>
              <Button
                component={Link}
                to="/"
                leftSection={<IconHome2 size={16} />}
                color="brandMint"
              >
                홈으로 이동
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
