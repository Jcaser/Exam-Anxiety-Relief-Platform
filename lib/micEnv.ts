/**
 * 麦克风运行环境判断
 *
 * 浏览器铁律：真实的语音识别（Web Speech API / getUserMedia）必须拿到麦克风权限，
 * 没有任何网页能绕过，这是 Chrome / Edge / Safari 的安全底线。
 *
 * 但有一个常见的"假拒绝"场景：页面被嵌在预览面板 / iframe 里时，浏览器默认
 * 禁止 iframe 访问麦克风，导致点麦克风直接报"权限被拒绝"却连授权弹窗都不弹。
 * 下面两个提示就是为这种场景准备的，引导用户到独立浏览器标签页里使用。
 */

/** 当前是否运行在嵌套的 iframe / 预览面板中（麦克风通常被禁用） */
export function isInSandboxedPreview(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    // 跨域 iframe 访问 window.top 会抛错，视为被嵌入的预览环境
    return true;
  }
}

/** 在预览面板 / iframe 里点麦克风时的友好提示 */
export const PREVIEW_MIC_HINT =
  "语音输入需要在独立浏览器标签页里使用～当前页面是在预览面板中，浏览器出于安全会禁用麦克风。" +
  "请在本机 Chrome / Edge 打开 http://localhost:3000，点麦克风允许一次即可 🎤";

/** 在真实浏览器里但权限被拒绝时的提示 */
export const DENIED_MIC_HINT =
  "麦克风权限还没给到～点浏览器地址栏左侧的 🔒 图标，把「麦克风」设为「允许」后刷新重试；" +
  "或在本机 Chrome / Edge 打开 http://localhost:3000 再试 🎤";
