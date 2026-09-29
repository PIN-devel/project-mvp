import {
  Alert,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconClock, IconInfoCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router";

interface ComingSoonPageProps {
  title: string;
  description: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <Container size="md" py="xl">
      <Paper withBorder p="xl" radius="md" shadow="sm">
        <Stack gap="lg">
          <Group gap="md" align="flex-start">
            <ThemeIcon color="brandMint" variant="light" size="xl">
              <IconClock size={28} />
            </ThemeIcon>
            <Stack gap={4}>
              <Title order={2}>{title}</Title>
              <Text c="dimmed">{description}</Text>
            </Stack>
          </Group>

          <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
            ADR-C03 기준으로 준비 중인 기능입니다. 기능이 활성화되기 전까지는 현재 제공 중인 화면을 이용해주세요.
          </Alert>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate("/washing")}
            >
              내역 세척 및 관리로 이동
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
