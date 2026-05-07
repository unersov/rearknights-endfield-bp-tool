import { Box, CloseButton, Flex, Heading, Text } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import "@/components/ui/About.scss";

export const Settings = () => {
    const { setUiView } = useGameStore();

    return (
        <Box width="100vw" height="100vh" bg="var(--gray-light)" p={8}>
            <Flex justify="space-between" align="center" mb={8} color="var(--gray-dark)">
                <Heading size="xl">// 设置</Heading>
                <CloseButton size="sm" onClick={() => setUiView('editor')} />
            </Flex>

            <Box mb="16px" p={6} borderRadius="lg" bg="var(--black-light)" border="1px solid var(--gray)" color="var(--gray-light)">
                <Heading size="md" mb={4}>语言</Heading>
                <Text>当前界面语言：简体中文</Text>
            </Box>
        </Box>
    );
};
