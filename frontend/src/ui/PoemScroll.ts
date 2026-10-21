export type PoemScrollState = {expanded: boolean; shelved: boolean; manual: boolean};

/** Automatic unrolling samples the poem clock. Manual folding uses a short CSS transition. */
export class PoemScroll {
  private state: PoemScrollState;
  private time = 0;
  private reduced = false;
  private rendered = '';
  private button: HTMLButtonElement;
  private openButton: HTMLButtonElement;
  private heading: HTMLElement;
  private body: HTMLElement;
  constructor(private root: HTMLElement, private revealTime: number, state?: PoemScrollState) {
    this.state=state ? {...state} : {expanded:true,shelved:false,manual:false};
    this.button=root.querySelector('h2 [data-scroll-toggle]')!;
    this.openButton=root.querySelector('.poem-scroll-open')!;
    this.heading=root.querySelector('h2')!;
    this.body=root.querySelector('.poem-scroll-body')!;
  }
  snapshot(): PoemScrollState {return {...this.state};}
  setReduced(value: boolean): void {this.reduced=value;this.seek(this.time);}
  seek(time: number): void {
    this.time=time;
    const ready=this.reduced||time>=this.revealTime;
    const open=ready&&this.state.expanded&&!this.state.shelved;
    const progress=open ? this.reduced||this.state.manual ? 1 : Math.max(0,Math.min(1,(time-this.revealTime)/.9)) : 0;
    const rendered=[ready,open,progress,this.state.manual].join(':');
    if(rendered===this.rendered)return;
    this.rendered=rendered;
    const ownedFocus=document.activeElement===this.button||document.activeElement===this.openButton;
    this.root.hidden=!ready;
    this.root.dataset.manual=String(this.state.manual);
    this.root.dataset.open=String(open);
    const value=String(progress);
    if(this.root.style.getPropertyValue('--scroll-progress')!==value)this.root.style.setProperty('--scroll-progress',value);
    this.button.setAttribute('aria-expanded',String(open));
    this.button.setAttribute('aria-label',open?'收起诗作背景':'展开诗作背景，回到全景');
    this.openButton.hidden=open;
    this.heading.inert=!open;
    this.heading.setAttribute('aria-hidden',String(!open));
    this.root.querySelector('.poem-scroll-action')!.textContent=open?'收卷':'展卷';
    this.body.inert=!open;
    this.body.setAttribute('aria-hidden',String(!open));
    if(ownedFocus&&ready)(open?this.button:this.openButton).focus({preventScroll:true});
  }
  toggle(): boolean {
    const opening=!this.state.expanded||this.state.shelved;
    this.state={expanded:opening,shelved:false,manual:true};
    this.seek(this.time);
    return opening;
  }
  setView(name: string): void {
    this.state.shelved=name!=='CAM_enter';
    this.state.manual=true;
    this.seek(this.time);
  }
  shelve(): void {this.setView('manual');}
  reset(): void {
    this.state={expanded:true,shelved:false,manual:false};
    this.body.scrollTop=0;
    this.seek(0);
  }
}
