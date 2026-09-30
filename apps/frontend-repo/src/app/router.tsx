import LoginPage from "@/features/auth/routes/LoginPage";
import RegisterPage from "@/features/auth/routes/RegisterPage";
import { loginAction, registerAction } from "@/features/auth/routes/action";
import { AiInsightsEntry } from "./AiInsightsEntry";
import { loader as aiInsightsLoader } from "@/features/ai-insights/routes/loader";
import { ruleEngineQueries } from "@/features/rule-engine-builder/api/queries";
import { SamplePage } from "@/features/sample/routes/SamplePage";
import { action as sampleAction } from "@/features/sample/routes/action";
import { loader as sampleLoader } from "@/features/sample/routes/loader";
import { WashingEntry } from "./WashingEntry";
import { action as washingAction } from "@/features/washing/routes/action";
import { loader as washingLoader } from "@/features/washing/routes/loader";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { NotFoundPage } from "@/shared/ui/NotFoundPage";
import { createBrowserRouter, redirect, Navigate, type ActionFunctionArgs, type LoaderFunctionArgs, type RouteObject } from "react-router";
import { ComingSoonPage } from "./ComingSoonPage";
import { Layout } from "./Layout";
import { RuleEngineBuilderPage } from "./RuleEngineBuilderPage";
import { queryClient } from "./queryClient";
import { useAppStore } from "@/app/store/useAppStore";

/**
 * 보안 라우팅 가드 로더
 * 첫 경험은 공개 Empty State로 제공하고 데이터 작업 경로는 인증을 유지합니다.
 */
const rootLoader = () => async ({ request }: LoaderFunctionArgs) => {
  const { isAuthenticated } = useAppStore.getState();
  const pathname = new URL(request.url).pathname;
  if (!isAuthenticated && pathname !== "/" && pathname !== "/washing") {
    return redirect("/login");
  }
  return null;
};

const protectedLoader = (load: () => Promise<unknown>) => async () => {
  if (!useAppStore.getState().isAuthenticated) return redirect("/login");
  return load();
};

const protectedAction = (act: ReturnType<typeof washingAction>) => async (args: ActionFunctionArgs) => {
  if (!useAppStore.getState().isAuthenticated) return redirect("/login");
  return act(args);
};

const ruleEngineLoader = () => async () => {
  await washingLoader(queryClient)();
  queryClient.prefetchQuery(ruleEngineQueries.rules());
  queryClient.prefetchQuery(ruleEngineQueries.patterns());
  return null;
};

export const routes: RouteObject[] = [
  {
    path: "/rules",
    loader: ({ request }) => {
      const url = new URL(request.url);
      return redirect(`/washing/rules${url.search}${url.hash}`);
    },
  },
  // 1. 공통 헤더 쉘 레이아웃에서 탈출한 단독 풀스크린 라우트
  {
    path: "/login",
    element: <LoginPage />,
    action: loginAction(),
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
    action: registerAction(),
    errorElement: <ErrorBoundary />,
  },
  
  // 2. 인증 가드가 탑재된 공통 레이아웃 보호 영역 라우트
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    loader: rootLoader(),
    shouldRevalidate: () => true,
    children: [
      {
        index: true,
        element: <Navigate to="/washing" replace />,
      },
      {
        path: "sample",
        element: <SamplePage />,
        loader: protectedLoader(sampleLoader(queryClient)),
        action: async (args) => {
          if (!useAppStore.getState().isAuthenticated) return redirect("/login");
          return sampleAction(queryClient)(args);
        },
      },
      {
        path: "washing",
        element: <WashingEntry />,
        loader: async () => useAppStore.getState().isAuthenticated ? washingLoader(queryClient)() : null,
        action: protectedAction(washingAction(queryClient)),
      },
      {
        path: "washing/rules",
        element: <RuleEngineBuilderPage />,
        loader: protectedLoader(ruleEngineLoader()),
        action: protectedAction(washingAction(queryClient)),
      },
      {
        path: "insights",
        element: <AiInsightsEntry />,
        loader: protectedLoader(aiInsightsLoader(queryClient)),
      },
      {
        path: "pivot",
        element: (
          <ComingSoonPage
            title="피벗 분석 준비 중"
            description="다차원 피벗 분석 화면은 현재 준비 중입니다."
          />
        ),
      },
      {
        path: "sim",
        element: (
          <ComingSoonPage
            title="미래 가치 시뮬레이터 준비 중"
            description="미래 가치 시뮬레이터 화면은 현재 준비 중입니다."
          />
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
