import {
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileSpreadsheet, IconUpload, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkAddTransactions, uploadExcel } from "@/features/washing/api/mutations";
import {
  EXCEL_UPLOAD_ACCEPT,
  MAX_EXCEL_FILE_SIZE,
  getExcelUploadErrorMessage,
} from "@/features/washing/model/excelUpload";
import { washingKeys } from "@/features/washing/api/queries";
import { formatAmount } from "@/features/washing/model/core";
import type { TransactionDto } from "@/features/washing/model/types";
import { toast } from "@/shared/ui/toast";

interface ExcelUploadModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExcelUploadModal({ opened, onClose, onSuccess }: ExcelUploadModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TransactionDto[] | null>(null);

  const parseMutation = useMutation({
    mutationFn: (f: File) => uploadExcel(f),
    onSuccess: (data) => setPreview(data),
    onError: (error) => toast.error(getExcelUploadErrorMessage(error)),
  });

  const saveMutation = useMutation({
    mutationFn: (items: TransactionDto[]) => bulkAddTransactions(items),
    onSuccess: async ({ added, skippedCount }) => {
      await queryClient.invalidateQueries({ queryKey: washingKeys.all });
      const msg = skippedCount > 0
        ? `${added.length}건 저장 완료 (${skippedCount}건 중복 스킵)`
        : `${added.length}건 저장 완료`;
      toast.success(msg);
      handleClose();
      onSuccess?.();
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    parseMutation.reset();
    saveMutation.reset();
    onClose();
  };

  const handleDrop = (files: File[]) => {
    const dropped = files[0];
    if (!dropped) return;
    setFile(dropped);
    setPreview(null);
    parseMutation.reset();
    parseMutation.mutate(dropped);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconFileSpreadsheet size={20} />
          <Title order={4}>엑셀 이용내역 업로드</Title>
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          카드사에서 내려받은 Excel 이용내역을 직접 가져오세요. 신한카드와 KB국민카드의
          내보내기 파일(.xls, .xlsx)을 지원합니다.
        </Text>

        <Dropzone
          onDrop={handleDrop}
          onReject={(rejections) => {
            const isTooLarge = rejections.some((rejection) =>
              rejection.errors.some((error) => error.code === "file-too-large"),
            );
            toast.error(
              isTooLarge
                ? "엑셀 파일은 최대 10MB까지 업로드할 수 있습니다."
                : ".xls 또는 .xlsx 파일만 업로드할 수 있습니다.",
            );
          }}
          accept={EXCEL_UPLOAD_ACCEPT}
          maxSize={MAX_EXCEL_FILE_SIZE}
          maxFiles={1}
          loading={parseMutation.isPending}
        >
          <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: "none" }}>
            <Dropzone.Accept>
              <IconUpload size={40} color="var(--mantine-color-blue-6)" stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={40} color="var(--mantine-color-red-6)" stroke={1.5} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFileSpreadsheet size={40} color="var(--mantine-color-dimmed)" stroke={1.5} />
            </Dropzone.Idle>
            <Stack gap={4}>
              {file ? (
                <>
                  <Text size="sm" fw={600}>
                    {file.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    파일을 교체하려면 다시 드래그하거나 클릭하세요
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" fw={600}>
                    엑셀 파일을 드래그하거나 클릭하여 선택
                  </Text>
                  <Text size="xs" c="dimmed">
                    .xls, .xlsx 형식만 지원합니다
                  </Text>
                </>
              )}
            </Stack>
          </Group>
        </Dropzone>

        {preview && (
          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                파싱 결과{" "}
                <Text component="span" c="blue" inherit>
                  {preview.length}건
                </Text>
              </Text>
              <Badge color="orange" variant="light">
                저장 전 미리보기
              </Badge>
            </Group>

            <ScrollArea>
              <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="md" fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>일자</Table.Th>
                    <Table.Th>가맹점</Table.Th>
                    <Table.Th>카드</Table.Th>
                    <Table.Th ta="right">금액</Table.Th>
                    <Table.Th>상태</Table.Th>
                    <Table.Th>메모</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {preview.map((tx, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>{tx.transactionDate}</Table.Td>
                      <Table.Td>{tx.merchant}</Table.Td>
                      <Table.Td>{tx.cardName}</Table.Td>
                      <Table.Td ta="right" fw={700}>
                        {formatAmount(tx.amount)}원
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={tx.status === "승인" ? "green" : "red"}
                          variant="light"
                          size="sm"
                        >
                          {tx.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {tx.memo ?? "-"}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Group justify="flex-end" pt="sm">
              <Button variant="light" color="gray" onClick={handleClose}>
                취소
              </Button>
              <Button
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(preview)}
              >
                {preview.length}건 저장
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
