import {
  Avatar,
  Box,
  Burger,
  Button,
  Container,
  Divider,
  Drawer,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Stack,
  Tabs,
  Text,
  UnstyledButton,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChartBar,
  IconChevronDown,
  IconLogout,
  IconReceipt,
  IconSettings,
  IconSettingsAutomation,
  IconSparkles,
} from "@tabler/icons-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { useState } from "react";
import type { IconProps } from "@tabler/icons-react";
import { BrandLogo } from "@/shared/ui/BrandLogo";

const userAvatarDefault =
  "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-5.png";

interface NavTab {
  label: string;
  value: string;
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
  disabled?: boolean;
}

const navTabs: NavTab[] = [
  { label: "이용내역", value: "/washing", icon: IconReceipt },
  { label: "자동 분류 규칙", value: "/rules", icon: IconSettingsAutomation },
  { label: "소비 분석", value: "/insights", icon: IconChartBar },
  ...(import.meta.env.DEV
    ? [{ label: "샘플", value: "/sample", icon: IconSparkles }]
    : []),
];

interface AppHeaderProps {
  activeTab: string | null;
  onTabChange: (value: string) => void;
  isAuthenticated: boolean;
  nickname: string | null;
  onLogout: () => void;
}

const getActiveTab = (pathname: string | null) =>
  navTabs.find((tab) => pathname?.startsWith(tab.value))?.value ?? "/washing";

export function AppHeader({
  activeTab,
  onTabChange,
  isAuthenticated,
  nickname,
  onLogout,
}: AppHeaderProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [userMenuOpened, setUserMenuOpened] = useState(false);
  const resolvedActiveTab = getActiveTab(activeTab);

  return (
    <Box component="header">
      <Container size="xl" h={60}>
        <Group justify="space-between" h="100%">
          <Group gap="md">
            <Burger
              opened={drawerOpened}
              onClick={toggleDrawer}
              hiddenFrom="sm"
              size="sm"
            />
            <UnstyledButton
              onClick={() => onTabChange("/washing")}
              aria-label="MOTIFIN 홈"
            >
              <BrandLogo surface="light" height={32} alt="" />
            </UnstyledButton>
          </Group>

          <Group gap="sm">
            {isAuthenticated ? (
              <Menu
                width={260}
                position="bottom-end"
                transitionProps={{ transition: "pop-top-right" }}
                onClose={() => setUserMenuOpened(false)}
                onOpen={() => setUserMenuOpened(true)}
                withinPortal
              >
                <Menu.Target>
                  <Button
                    variant={userMenuOpened ? "light" : "subtle"}
                    color="gray"
                    px="xs"
                    h={38}
                  >
                    <Group gap={7}>
                      <Avatar
                        src={userAvatarDefault}
                        alt={nickname || "사용자"}
                        radius="xl"
                        size={24}
                      />
                      <Text fw={500} size="sm" lh={1} mr={3} visibleFrom="xs">
                        {nickname}
                      </Text>
                      <IconChevronDown size={12} stroke={1.5} />
                    </Group>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>사용자</Menu.Label>
                  <Menu.Item
                    leftSection={<IconSettings size={16} stroke={1.5} />}
                  >
                    계정 설정
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLogout size={16} stroke={1.5} />}
                    onClick={onLogout}
                  >
                    로그아웃
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Group gap="xs" visibleFrom="xs">
                <Button
                  variant="default"
                  radius="sm"
                  size="sm"
                  h={34}
                  onClick={() => onTabChange("/login")}
                >
                  로그인
                </Button>
                <Button
                  color="brandMint"
                  radius="sm"
                  size="sm"
                  h={34}
                  onClick={() => onTabChange("/register")}
                >
                  회원가입
                </Button>
              </Group>
            )}
          </Group>
        </Group>
      </Container>

      <Container size="xl" visibleFrom="sm">
        <Tabs
          value={resolvedActiveTab}
          onChange={(value) => onTabChange(value || "/washing")}
          styles={{
            list: {
              gap: rem(6),
              borderBottom: 0,
              paddingBottom: rem(8),
              "--tabs-list-border-width": "0",
            },
            tab: {
              minHeight: rem(42),
              paddingInline: rem(16),
              borderRadius: rem(12),
              fontWeight: 700,
              color: "var(--mantine-color-dimmed)",
              backgroundColor: "transparent",
              transition:
                "background-color 150ms ease, color 150ms ease, box-shadow 150ms ease",
            },
            tabSection: {
              marginInlineEnd: rem(8),
            },
          }}
        >
          <Tabs.List>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = resolvedActiveTab === tab.value;

              return (
                <Tabs.Tab
                  key={tab.value}
                  value={tab.value}
                  disabled={tab.disabled}
                  leftSection={<Icon size={16} />}
                  bg={isActive ? "brandMint.5" : undefined}
                  c={isActive ? "#0D1730" : "dimmed"}
                  bd={isActive ? "1px solid var(--mantine-color-brandMint-6)" : undefined}
                >
                  {tab.label}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs>
      </Container>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title="Navigation"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          {navTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.value}
                label={tab.label}
                leftSection={<Icon size={18} />}
                active={resolvedActiveTab === tab.value}
                disabled={tab.disabled}
                onClick={() => {
                  if (tab.disabled) {
                    return;
                  }
                  onTabChange(tab.value);
                  closeDrawer();
                }}
                fw={resolvedActiveTab === tab.value ? 700 : 500}
                color="#006B56"
              />
            );
          })}

          <Divider my="sm" />

          <Box px="md" py="xs">
            {isAuthenticated ? (
              <Stack gap="xs">
                <Text fw={500} size="sm">
                  접속 계정: {nickname}
                </Text>
                <Button
                  variant="default"
                  radius="sm"
                  fullWidth
                  onClick={() => {
                    onLogout();
                    closeDrawer();
                  }}
                >
                  로그아웃
                </Button>
              </Stack>
            ) : (
              <Stack gap="xs">
                <Button
                  variant="default"
                  radius="sm"
                  fullWidth
                  onClick={() => {
                    onTabChange("/login");
                    closeDrawer();
                  }}
                >
                  로그인
                </Button>
                <Button
                  color="brandMint"
                  radius="sm"
                  fullWidth
                  onClick={() => {
                    onTabChange("/register");
                    closeDrawer();
                  }}
                >
                  회원가입
                </Button>
              </Stack>
            )}
          </Box>
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
