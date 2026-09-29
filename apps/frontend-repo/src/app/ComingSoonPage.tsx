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
            이 기능은 아직 준비 중이에요. 이용내역 화면으로 이동해 지금 사용할 수 있는 기능을 이어서 이용해 주세요.
          </Alert>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate("/washing")}
            >
              이용내역으로 이동
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
