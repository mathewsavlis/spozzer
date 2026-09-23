export function createHorizontalDrag(
  target,
  {
    threshold = 6,

    onStart = () => {},
    onMove = () => {},
    onEnd = () => {},
  } = {}
) {
  if (
    !(target instanceof HTMLElement)
  ) {
    return () => {};
  }

  let pointerId = null;

  let startX = 0;
  let startY = 0;

  let currentX = 0;
  let currentY = 0;

  let direction = null;
  let started = false;

  // Eventos pointermove podem chegar mais rápido que a taxa de atualização
  // da tela. Calculamos a posição final de cada frame apenas uma vez.
  let moveFrame = 0;
  let pendingMove = null;

  function flushMove() {
    moveFrame = 0;
    if (!pendingMove) return;
    const move = pendingMove;
    pendingMove = null;
    onMove(move);
  }

  function reset() {
    if (moveFrame) cancelAnimationFrame(moveFrame);
    moveFrame = 0;
    pendingMove = null;
    pointerId = null;

    direction = null;
    started = false;
  }

  function handlePointerDown(event) {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    // Um novo toque invalida o frame pendente do toque anterior.
    if (moveFrame) cancelAnimationFrame(moveFrame);
    moveFrame = 0;
    pendingMove = null;

    pointerId = event.pointerId;

    startX = event.clientX;
    startY = event.clientY;

    currentX = startX;
    currentY = startY;

    direction = null;
    started = false;
  }

  function handlePointerMove(event) {
    if (
      event.pointerId !== pointerId
    ) {
      return;
    }

    currentX = event.clientX;
    currentY = event.clientY;

    const deltaX =
      currentX - startX;

    const deltaY =
      currentY - startY;

    if (!direction) {
      const absX =
        Math.abs(deltaX);

      const absY =
        Math.abs(deltaY);

      if (
        absX < threshold &&
        absY < threshold
      ) {
        return;
      }

      /*
       * Só assume controle quando
       * o gesto é claramente horizontal.
       */
      if (
        absX >
        absY * 1.15
      ) {
        direction = "horizontal";

        started = true;

        target.setPointerCapture?.(
          pointerId
        );

        onStart({
          event,
          startX,
          startY,
        });
      } else {
        direction = "vertical";
      }
    }

    if (
      direction !== "horizontal"
    ) {
      return;
    }

    event.preventDefault();

    pendingMove = { event, deltaX, deltaY };
    if (!moveFrame) moveFrame = requestAnimationFrame(flushMove);
  }

  function finish(event) {
    if (
      event.pointerId !== pointerId
    ) {
      return;
    }

    // Garante que o último movimento foi renderizado antes do snap,
    // mesmo quando pointerup ocorre antes do próximo animation frame.
    if (moveFrame) cancelAnimationFrame(moveFrame);
    if (pendingMove) flushMove();

    const deltaX =
      currentX - startX;

    const deltaY =
      currentY - startY;

    if (
      direction === "horizontal" &&
      started
    ) {
      onEnd({
        event,
        deltaX,
        deltaY,

        moved:
          Math.abs(deltaX) >= threshold,
      });
    }

    if (
      target.hasPointerCapture?.(
        pointerId
      )
    ) {
      target.releasePointerCapture?.(
        pointerId
      );
    }

    reset();
  }

  target.addEventListener(
    "pointerdown",
    handlePointerDown
  );

  target.addEventListener(
    "pointermove",
    handlePointerMove,
    {
      passive: false,
    }
  );

  target.addEventListener(
    "pointerup",
    finish
  );

  target.addEventListener(
    "pointercancel",
    finish
  );

  return () => {
    reset();
    target.removeEventListener(
      "pointerdown",
      handlePointerDown
    );

    target.removeEventListener(
      "pointermove",
      handlePointerMove
    );

    target.removeEventListener(
      "pointerup",
      finish
    );

    target.removeEventListener(
      "pointercancel",
      finish
    );
  };
}