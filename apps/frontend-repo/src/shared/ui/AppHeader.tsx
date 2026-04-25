import {
  ActionIcon,
  Avatar,
  Box,
  Burger,
  Container,
  Divider,
  Drawer,
  Group,
  Menu,
  rem,
  ScrollArea,
  Tabs,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useState } from "react";

const user = {
  name: "Jane Spoonfighter",
  email: "janspoon@fighter.dev",
  image:
    "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-5.png",
};

const navTabs = [
  { label: "내역관리", value: "/history" },
  { label: "시각화", value: "/stats" },
  { label: "개인화", value: "/personal" },
  { label: "설정", value: "/settings" },
  { label: "샘플", value: "/sample" },
];

interface AppHeaderProps {
  colorScheme: "light" | "dark";
  onToggleColorScheme: () => void;
  activeTab: string | null;
  onTabChange: (value: string) => void;
}

/**
 * 공용 헤더 컴포넌트
 */
export function AppHeader({
  colorScheme,
  onToggleColorScheme,
  activeTab,
  onTabChange,
}: AppHeaderProps) {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [userMenuOpened, setUserMenuOpened] = useState(false);

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
            <Title
              order={3}
              style={{
                cursor: "pointer",
                color: "var(--mantine-color-brandYellow-filled)",
              }}
              onClick={() => onTabChange("/")}
            >
              카드 이용내역 관리
            </Title>
          </Group>

          <Group gap="sm">
            <ActionIcon
              variant="default"
              size="lg"
              onClick={onToggleColorScheme}
              title="테마 변경"
              visibleFrom="sm"
            >
              {colorScheme === "dark" ? (
                <IconSun size={20} stroke={1.5} />
              ) : (
                <IconMoon size={20} stroke={1.5} />
              )}
            </ActionIcon>

            <Menu
              width={260}
              position="bottom-end"
              transitionProps={{ transition: "pop-top-right" }}
              onClose={() => setUserMenuOpened(false)}
              onOpen={() => setUserMenuOpened(true)}
              withinPortal
            >
              <Menu.Target>
                <UnstyledButton
                  px="xs"
                  py={4}
                  style={(theme) => ({
                    borderRadius: theme.radius.sm,
                    transition: "background-color 100ms ease",
                    backgroundColor: userMenuOpened
                      ? "var(--mantine-color-default-hover)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "var(--mantine-color-default-hover)",
                    },
                  })}
                >
                  <Group gap={7}>
                    <Avatar
                      src={user.image}
                      alt={user.name}
                      radius="xl"
                      size={24}
                    />
                    <Text fw={500} size="sm" lh={1} mr={3} visibleFrom="xs">
                      {user.name}
                    </Text>
                    <IconChevronDown size={12} stroke={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>사용자</Menu.Label>
                <Menu.Item
                  leftSection={<IconSettings size={16} stroke={1.5} />}
                >
                  계정 설정
                </Menu.Item>
                <Menu.Item leftSection={<IconLogout size={16} stroke={1.5} />}>
                  로그아웃
                </Menu.Item>

                <Menu.Divider />

                <Menu.Item
                  leftSection={
                    colorScheme === "dark" ? (
                      <IconSun size={16} stroke={1.5} />
                    ) : (
                      <IconMoon size={16} stroke={1.5} />
                    )
                  }
                  onClick={onToggleColorScheme}
                  hiddenFrom="sm"
                >
                  {colorScheme === "dark" ? "Light Mode" : "Dark Mode"}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Container>

      <Container size="xl" visibleFrom="sm">
        <Tabs
          value={activeTab}
          onChange={(value) => onTabChange(value || "/")}
          variant="outline"
          styles={(theme) => ({
            list: {
              borderBottom: 0,
              "--tabs-list-border-width": "0",
            },
            tab: {
              fontWeight: 500,
              height: rem(38),
              backgroundColor: "transparent",
              borderBottomColor: "transparent",
              "&:hover": {
                backgroundColor:
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1],
              },
              "&[data-active]": {
                backgroundColor:
                  colorScheme === "dark"
                    ? "var(--mantine-color-dark-8)"
                    : theme.white,
                borderColor:
                  colorScheme === "dark"
                    ? "var(--mantine-color-dark-4)"
                    : theme.colors.gray[2],
                borderBottomColor:
                  colorScheme === "dark"
                    ? "var(--mantine-color-dark-8)"
                    : theme.white,
                marginBottom: rem(-1),
              },
            },
          })}
        >
          <Tabs.List>
            {navTabs.map((tab) => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Tab>
            ))}
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
          {navTabs.map((tab) => (
            <UnstyledButton
              key={tab.value}
              onClick={() => {
                onTabChange(tab.value);
                closeDrawer();
              }}
              style={(theme) => ({
                display: "block",
                width: "100%",
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color:
                  activeTab === tab.value
                    ? "var(--mantine-color-brandYellow-6)"
                    : "inherit",
                fontWeight: activeTab === tab.value ? 700 : 500,
                "&:hover": {
                  backgroundColor: "var(--mantine-color-default-hover)",
                },
              })}
            >
              {tab.label}
            </UnstyledButton>
          ))}
        </ScrollArea>
      </Drawer>
    </Box>
  );
}
