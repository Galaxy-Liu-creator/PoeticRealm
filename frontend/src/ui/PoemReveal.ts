import {PoemScroll, type PoemScrollState} from './PoemScroll';

/** Four-line poems unfold from right to left, sampled from the existing presentation clock. */
export class PoemReveal {
  private lines: HTMLElement[];
  private time = 0;
  private reduced = false;
  readonly duration: number;
  readonly scroll?: PoemScroll;
  constructor(root: HTMLElement, scrollState?: PoemScrollState) {
    this.lines = [...root.querySelectorAll<HTMLElement>('[data-reveal-line]')];
    this.duration = this.lines.length;
    const scroll=root.querySelector<HTMLElement>('[data-poem-scroll]');
    if(scroll)this.scroll=new PoemScroll(scroll,this.duration,scrollState);
  }
  setReduced(value: boolean): void {this.reduced=value;this.scroll?.setReduced(value);this.seek(this.time);}
  seek(time: number): void {
    this.time=time;
    this.scroll?.seek(time);
    for (const [index,line] of this.lines.entries()) {
      const p=this.reduced?1:Math.max(0,Math.min(1,(time-index-.1)/.8));
      const opacity=p*p*(3-2*p);
      if(line.style.opacity===String(opacity))continue;
      line.style.opacity=String(opacity);
      line.style.transform=`translateY(${(1-opacity)*6}px)`;
      const button=line.querySelector<HTMLButtonElement>('button');
      if(button)button.tabIndex=opacity>.05?0:-1;
    }
  }
}
