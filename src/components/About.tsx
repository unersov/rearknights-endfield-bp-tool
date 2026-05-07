import { Box, CloseButton, Flex, Heading, Text } from '@chakra-ui/react';
import { useGameStore } from '../store/gameStore';
import "@/components/ui/About.scss";

export const About = () => {
    const { setUiView } = useGameStore();

    return (
        <Box width="100vw" height="100vh" bg="var(--gray-light)" p={8}>
            <Flex justify="space-between" align="center" mb={8} color="var(--gray-dark)">
                <Heading size="xl">// 关于</Heading>
                <CloseButton size="sm" onClick={() => setUiView('editor')} />
            </Flex>

            <Box mb="16px" p={6} borderRadius="lg" bg="var(--black-light)" border="1px solid var(--gray)" color="var(--gray-light)">
                <Text fontSize="sm" lineHeight="1.7">
                    本工具是面向玩家社区制作的蓝图辅助工具，与游戏官方无直接关联。
                    网站内使用的游戏素材，包括图片、图标和设计元素，其版权归属游戏官方及原作者所有。
                    本工具不进行任何商业盈利行为。如有侵权问题，请联系作者处理。
                </Text>
            </Box>
        </Box>
    );
};
