import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';

function revealEmphasizedLine(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;

    if (child.type === 'em') {
      return cloneElement(
        child,
        undefined,
        <span className="reveal-heading-mask">
          <span className="reveal-heading-content">{child.props.children}</span>
          <span className="reveal-heading-block" aria-hidden="true" />
        </span>,
      );
    }

    if (child.props.children === undefined) return child;
    return cloneElement(child, undefined, revealEmphasizedLine(child.props.children));
  });
}

export function RevealHeading({ children, className, ...props }: ComponentPropsWithoutRef<'h1'>) {
  return (
    <h1 className={className} {...props}>
      {revealEmphasizedLine(children)}
    </h1>
  );
}
