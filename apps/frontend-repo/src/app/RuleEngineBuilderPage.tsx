import {
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Suspense } from "react";
import { Link, useSearchParams } from "react-router";
import { RuleEngineBuilderPanel } from "@/features/rule-engine-builder/ui/RuleEngineBuilderPanel";
import { washingKeys, washingQueries } from "@/features/washing/api/queries";

export function RuleEngineBuilderPageSkeleton() {
  return (
    <Stack gap="xl" w="100%" pt={28} pb={72} aria-busy="true">
      <Paper withBorder p="xl" radius="lg">
        <Stack gap="sm">
          <Skeleton height={12} width="24%" />
          <Skeleton height={34} width="54%" />
          <Skeleton height={16} width="72%" />
          <Text
            component="div"
            size="sm"
            c="dimmed"
            role="status"
            aria-live="polite"
            aria-label="규칙 화면을 불러오고 있어요."
          >
            규칙 화면을 불러오고 있어요.
          </Text>
        </Stack>
      </Paper>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
        <Paper withBorder p="xl" radius="lg">
          <Stack gap="lg">
            <Group gap="sm">
              <Skeleton height={40} width={40} circle />
              <Skeleton height={26} width="48%" />
            </Group>
            <Skeleton height={52} />
            <Skeleton height={40} width="36%" />
            <Stack gap="sm">
              <Skeleton height={54} />
              <Skeleton height={54} />
              <Skeleton height={54} />
            </Stack>
          </Stack>
        </Paper>
        <Paper withBorder p="xl" radius="lg">
          <Stack gap="lg">
            <Group gap="sm">
              <Skeleton height={40} width={40} circle />
              <Skeleton height={26} width="58%" />
            </Group>
            <Skeleton height={72} />
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
              <Skeleton height={52} />
              <Skeleton height={52} />
              <Skeleton height={52} />
            </SimpleGrid>
            <Skeleton height={42} />
          </Stack>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}

function RuleEngineBuilderContent() {
  const queryClient = useQueryClient();
  const [{ data: transactions }, { data: categories }] = useSuspenseQueries({
    queries: [washingQueries.transactions(), washingQueries.categories()],
  });

  return (
    <RuleEngineBuilderPanel
      categories={categories}
      transactions={transactions}
      onRuleApplied={() => {
        queryClient.invalidateQueries({ queryKey: washingKeys.all });
      }}
      onCategoriesChanged={() => {
        queryClient.invalidateQueries({ queryKey: washingKeys.all });
      }}
    />
  );
}

export function RuleEngineBuilderPage() {
  const [params] = useSearchParams();
  const goalContext = params.get("flow") === "goal-update" && params.get("goalId")
    ? `?${new URLSearchParams({ goalId: params.get("goalId")!, flow: "goal-update" })}` : "";
  return (
    <Container size={1180} w="100%">
      <Stack gap="md" w="100%">
        <Group><Button component={Link} to={`/washing${goalContext}`} variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} vars={() => ({ root: { "--button-hover": "transparent" } })}>이용내역으로 돌아가기</Button></Group>
        <Suspense fallback={<RuleEngineBuilderPageSkeleton />}>
          <RuleEngineBuilderContent />
        </Suspense>
      </Stack>
    </Container>
  );
}
