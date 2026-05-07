export const useChineseConverter = () => {
    document.documentElement.lang = 'zh-CN';
    return { language: 'zh-CN', isConverting: false };
};
