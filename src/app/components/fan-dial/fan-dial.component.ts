import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output
} from '@angular/core';

@Component({
  selector: 'app-fan-dial',
  templateUrl: './fan-dial.component.html',
  styleUrls: [
    './fan-dial.component.css'
  ]
})
export class FanDialComponent implements OnChanges {

  @Input()
  value = 0;

  @Input()
  disabled = false;

  @Output()
  committed = new EventEmitter<number>();

  preview = 0;

  private dragging = false;

  ngOnChanges(): void {
    if (this.disabled) {
      this.dragging = false;
    }

    if (!this.dragging) {
      this.preview = this.clamp(
        this.value
      );
    }
  }

  start(
    event: PointerEvent
  ): void {

    if (
      this.disabled ||
      event.button !== 0
    ) {
      return;
    }

    const element =
      this.getElement(event);

    if (!element) {
      return;
    }

    event.preventDefault();

    this.dragging = true;

    element.setPointerCapture(
      event.pointerId
    );

    this.updateFromPointer(
      event,
      element
    );
  }

  move(
    event: PointerEvent
  ): void {

    if (
      !this.dragging ||
      this.disabled
    ) {
      return;
    }

    const element =
      this.getElement(event);

    if (!element) {
      return;
    }

    event.preventDefault();

    this.updateFromPointer(
      event,
      element
    );
  }

  finish(
    event: PointerEvent
  ): void {

    if (!this.dragging) {
      return;
    }

    const element =
      this.getElement(event);

    if (!element) {
      this.dragging = false;
      return;
    }

    event.preventDefault();

    this.updateFromPointer(
      event,
      element
    );

    this.dragging = false;

    if (
      element.hasPointerCapture(
        event.pointerId
      )
    ) {
      element.releasePointerCapture(
        event.pointerId
      );
    }

    if (!this.disabled) {
      this.committed.emit(
        this.preview
      );
    }
  }

  cancel(): void {

    this.dragging = false;

    this.preview =
      this.clamp(
        this.value
      );
  }

  key(
    event: KeyboardEvent
  ): void {

    if (this.disabled) {
      return;
    }

    let nextValue =
      this.preview;

    switch (event.key) {

      case 'ArrowUp':
      case 'ArrowRight':
        nextValue += 1;
        break;

      case 'ArrowDown':
      case 'ArrowLeft':
        nextValue -= 1;
        break;

      case 'PageUp':
        nextValue += 10;
        break;

      case 'PageDown':
        nextValue -= 10;
        break;

      case 'Home':
        nextValue = 0;
        break;

      case 'End':
        nextValue = 100;
        break;

      default:
        return;
    }

    event.preventDefault();

    this.preview =
      this.clamp(
        nextValue
      );

    this.committed.emit(
      this.preview
    );
  }

  private getElement(
    event: PointerEvent
  ): HTMLElement | null {

    const currentTarget =
      event.currentTarget;

    if (
      currentTarget instanceof HTMLElement
    ) {
      return currentTarget;
    }

    return null;
  }

  private updateFromPointer(
    event: PointerEvent,
    element: HTMLElement
  ): void {

    const box =
      element.getBoundingClientRect();

    const centerX =
      box.left +
      box.width / 2;

    const centerY =
      box.top +
      box.height / 2;

    const x =
      event.clientX -
      centerX;

    const y =
      event.clientY -
      centerY;

    const angle =
      Math.atan2(
        x,
        -y
      ) *
      180 /
      Math.PI;

    let normalizedAngle =
      angle;

    if (
      normalizedAngle < -135
    ) {
      normalizedAngle = -135;
    }

    if (
      normalizedAngle > 135
    ) {
      normalizedAngle = 135;
    }

    const percentage =
      (
        normalizedAngle + 135
      ) /
      270 *
      100;

    this.preview =
      this.clamp(
        percentage
      );
  }

  private clamp(
    value: number
  ): number {

    if (
      !Number.isFinite(value)
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(value)
      )
    );
  }
}