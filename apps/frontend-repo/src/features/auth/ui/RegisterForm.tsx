import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmit, Link, useNavigation } from "react-router";
import { TextInput, PasswordInput, Button, Paper, Title, Stack, Text, Anchor, useMantineColorScheme } from "@mantine/core";
import { RegisterFormSchema } from "../model/schemas";
import type { RegisterFormInput } from "../model/schemas";

/**
 * 회원가입 폼 컴포넌트
 * RHF + zodResolver(RegisterFormSchema)로 비밀번호 일치 등 확장 필드 검증을 관리하며,
 * 최종 트랜잭션 처리는 React Router Action으로 흘려보냅니다.
 */
export function RegisterForm() {
  const { colorScheme } = useMantineColorScheme();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      loginId: "",
      nickname: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: RegisterFormInput) => {
    // 비밀번호 확인 필드는 API DTO 명세에 없으므로, API 스펙에 맞는 필드들만 action에 제출합니다.
    const registerPayload = {
      loginId: data.loginId,
      nickname: data.nickname,
      password: data.password,
    };
    submit(registerPayload as unknown as Record<string, string>, { method: "post" });
  };

  return (
    <Paper radius="md" p="xl" withBorder shadow="md" bg="var(--mantine-color-body)">
      <Title order={2} ta="center" mb="lg" fw={700}>
        회원가입
      </Title>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            required
            label="아이디"
            placeholder="아이디를 입력하세요 (2자 이상)"
            radius="sm"
            error={errors.loginId?.message}
            {...register("loginId")}
          />

          <TextInput
            required
            label="닉네임"
            placeholder="사용하실 닉네임을 입력하세요"
            radius="sm"
            error={errors.nickname?.message}
            {...register("nickname")}
          />

          <PasswordInput
            required
            label="비밀번호"
            placeholder="비밀번호를 입력하세요"
            radius="sm"
            error={errors.password?.message}
            {...register("password")}
          />

          <PasswordInput
            required
            label="비밀번호 확인"
            placeholder="비밀번호를 한 번 더 입력하세요"
            radius="sm"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button
            type="submit"
            radius="sm"
            color="brandMint"
            loading={isSubmitting}
            mt="md"
            fullWidth
          >
            가입하기
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm" c="dimmed">
        이미 계정이 있으신가요?{" "}
        <Anchor
          component={Link}
          to="/login"
          fw={500}
          c={colorScheme === "dark" ? "brandMint.2" : "#006B56"}
        >
          로그인
        </Anchor>
      </Text>
    </Paper>
  );
}
