import { isRouteErrorResponse, useRouteError } from "react-router";
import { Container, Title, Text, Button, Paper, Stack, Group, ThemeIcon } from "@mantine/core";
import type { ProblemDetail } from "@/shared/model/problemDetail";

export function ErrorBoundary() {
  const error = useRouteError();

  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.statusText || String(error.data);
  } else if (error && typeof error === "object" && "detail" in error) {
    message = (error as ProblemDetail).detail || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Container size="sm" py="xl">
      <Paper withBorder p="xl" radius="md" shadow="md">
        <Stack align="center" gap="lg">
          <ThemeIcon color="red" size={60} radius="xl">
            <Text size="xl" fw={900} c="white">!</Text>
          </ThemeIcon>
          
          <Stack align="center" gap="xs">
            <Title order={2}>Oops! Something went wrong</Title>
            <Text c="dimmed" ta="center">
              The application encountered an error. Please try again or contact support if the issue persists.
            </Text>
          </Stack>

          <Paper withBorder p="md" radius="sm" bg="var(--mantine-color-red-0)" w="100%">
            <Text size="sm" c="red" fw={500} ta="center">
              {message}
            </Text>
          </Paper>

          <Group>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button onClick={() => window.location.href = "/"}>
              Go to Home
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
