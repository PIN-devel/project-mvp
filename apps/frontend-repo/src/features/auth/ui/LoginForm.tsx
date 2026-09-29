import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmit, Link, useNavigation } from "react-router";
import { TextInput, PasswordInput, Button, Paper, Title, Stack, Text, Anchor, useMantineColorScheme } from "@mantine/core";
import { LoginRequestSchema } from "../model/schemas";
import type { LoginRequest } from "../model/types";

/**
 * 로그인 폼 컴포넌트
 * react-hook-form + zodResolver로 실시간 데이터 검증 및 비제어 렌더링 성능을 보장하며,
 * 최종 제출은 React Router Data Mode의 action으로 위임합니다.
 */
export function LoginForm() {
  const { colorScheme } = useMantineColorScheme();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginRequest) => {
    // react-router action 트리거
    submit(data as unknown as Record<string, string>, { method: "post" });
  };

  return (
    <Paper radius="md" p="xl" withBorder shadow="md" bg="var(--mantine-color-body)">
      <Title order={2} ta="center" mb="lg" fw={700}>
        로그인
      </Title>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            required
            label="아이디"
            placeholder="아이디를 입력하세요"
            radius="sm"
            error={errors.loginId?.message}
            {...register("loginId")}
          />

          <PasswordInput
            required
            label="비밀번호"
            placeholder="비밀번호를 입력하세요"
            radius="sm"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button
            type="submit"
            radius="sm"
            color="brandMint"
            loading={isSubmitting}
            mt="md"
            fullWidth
          >
            로그인
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm" c="dimmed">
        아직 회원이 아니신가요?{" "}
        <Anchor
          component={Link}
          to="/register"
          fw={500}
          c={colorScheme === "dark" ? "brandMint.2" : "#006B56"}
        >
          회원가입
        </Anchor>
      </Text>
    </Paper>
  );
}
