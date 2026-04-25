import { Container, Skeleton, Stack, Group, Paper, SimpleGrid } from "@mantine/core";

/**
 * 샘플 페이지 로딩 스켈레톤 UI
 */
export function SamplePageSkeleton() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Skeleton h={40} w="60%" radius="md" />
        <Paper withBorder p="xl" radius="md">
          <Stack gap="md">
            <Skeleton h={30} w="40%" radius="sm" />
            <Group grow>
              <Skeleton h={40} radius="sm" />
              <Skeleton h={40} w={100} radius="sm" />
            </Group>
          </Stack>
        </Paper>
        <Stack gap="md">
          <Skeleton h={30} w="30%" radius="sm" />
          <SimpleGrid cols={1} spacing="md">
            {[1, 2, 3].map((i) => (
              <Paper key={i} withBorder p="xl" radius="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Skeleton h={20} w={150} radius="sm" />
                    <Skeleton h={15} w={100} radius="sm" />
                  </Group>
                  <Skeleton h={1} radius="sm" />
                  <Group grow>
                    <Skeleton h={40} radius="sm" />
                    <Skeleton h={40} w={120} radius="sm" />
                  </Group>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
