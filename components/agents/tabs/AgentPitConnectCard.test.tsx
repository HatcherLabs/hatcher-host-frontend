// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
let root: Root;
function render(node: ReactNode) { const el=document.createElement('div'); document.body.appendChild(el); root=createRoot(el); act(()=>root.render(node)); }
const screen={ getByRole(role:string, filter?:{name:string}) { const selector=role==='button'?'button':role==='link'?'a':'[role="'+role+'"]'; const el=[...document.querySelectorAll(selector)].find(x=>!filter||x.textContent?.includes(filter.name)); if(!el)throw Error('Missing '+role); return el; } };
const fireEvent={click:(el:Element)=>el.dispatchEvent(new MouseEvent('click',{bubbles:true}))};
function cleanup(){act(()=>root?.unmount());document.body.innerHTML='';}
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
import { AgentPitConnectCard } from './AgentPitConnectCard';
const mock = vi.hoisted(() => ({begin:vi.fn(),poll:vi.fn()}));
vi.mock('@/lib/api', () => ({api:{beginAgentPitConnect:mock.begin,pollAgentPitConnect:mock.poll}}));
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); vi.spyOn(window,'open').mockReturnValue(null); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it('opens authorization then observes completion without starting trading', async () => {
  mock.begin.mockResolvedValue({success:true,data:{status:'authorization_required',verificationUrl:'https://supportive-banquet-05.authkit.app/device?user_code=CODE',userCode:'CODE',expiresAt:new Date(Date.now()+300000).toISOString(),interval:5}});
  mock.poll.mockResolvedValue({success:true,data:{status:'connected',connectorId:'con'}});
  const done=vi.fn(); render(<AgentPitConnectCard agentId="agent" connected={false} onConnected={done}/>);
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Connect AgentPit'}));});
  expect(screen.getByRole('link',{name:'Finish signing in to AgentPit'}).getAttribute('href')).toContain('/device?user_code=CODE');
  await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});
  expect(done).toHaveBeenCalledOnce(); expect(mock.poll).toHaveBeenCalledWith('agent');
});
it('rejects a non-provider sign-in URL',async()=>{
  mock.begin.mockResolvedValue({success:true,data:{status:'authorization_required',verificationUrl:'https://evil.invalid/device',userCode:'CODE',expiresAt:new Date(Date.now()+300000).toISOString(),interval:5}});
  render(<AgentPitConnectCard agentId="agent" connected={false} onConnected={()=>{}}/>);
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Connect AgentPit'}));});
  expect(screen.getByRole('alert').textContent).toBe('Unexpected sign-in address.'); expect(mock.poll).not.toHaveBeenCalled();
});
it('does not begin authorization for a connected account',()=>{
  render(<AgentPitConnectCard agentId="agent" connected={true} onConnected={()=>{}}/>);
  expect(screen.getByRole('button',{name:'Connected'}).hasAttribute('disabled')).toBe(true); expect(mock.begin).not.toHaveBeenCalled();
});