/**
 * The website's Crisp chat (same inbox the team already answers), shown inside the app. The id is public (it is in every page of the
 * site); Crisp only serves the chat for pages on www.nikfoods.com, so the page below is loaded with that address as its base.
 */
export const CRISP_WEBSITE_ID = '2490be0e-29be-4101-8004-e3caa03f7c4d';
export const CRISP_BASE_URL = 'https://www.nikfoods.com';

export interface ChatWho {
  name?: string;
  email?: string;
  orderId?: string;
}

const clean = (s: unknown, max = 120) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

/** The small page that opens the chat: the customer is identified inside the page (nothing personal goes in a web address). */
export function crispPageHtml(who: ChatWho = {}): string {
  const email = clean(who.email, 200);
  const name = clean(who.name, 80);
  const order = clean(who.orderId, 60);
  // JSON.stringify makes every value a safe JavaScript string; "<" is escaped so the value can never close the script tag
  const js = (v: string) => JSON.stringify(v).replace(/</g, '\\u003c');
  const data: Array<[string, string]> = [['source', 'NikFoods iPhone app']];
  if (order) data.push(['order_id', order]);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>html,body{margin:0;height:100%;background:#fff}</style></head><body><script>
window.$crisp=[];window.CRISP_WEBSITE_ID=${js(CRISP_WEBSITE_ID)};
${email ? `$crisp.push(["set","user:email",[${js(email)}]]);` : ''}
${name ? `$crisp.push(["set","user:nickname",[${js(name)}]]);` : ''}
$crisp.push(["set","session:data",[${JSON.stringify(data).replace(/</g, '\\u003c')}]]);
$crisp.push(["on","chat:closed",function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage("closed");}]);
$crisp.push(["on","chat:opened",function(){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage("opened");}]);
(function(){var d=document,s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;s.onload=function(){$crisp.push(["do","chat:open"]);};d.getElementsByTagName("head")[0].appendChild(s);})();
</script></body></html>`;
}

/** Only Crisp's own pages stay inside the chat; a link an agent sends opens in the phone's browser. */
export function isCrispUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (url === 'about:blank') return true;
    return u.protocol === 'https:' && (u.hostname === 'crisp.chat' || u.hostname.endsWith('.crisp.chat') || u.hostname.endsWith('.crisp.help') || u.hostname === 'www.nikfoods.com');
  } catch {
    return url === 'about:blank';
  }
}
