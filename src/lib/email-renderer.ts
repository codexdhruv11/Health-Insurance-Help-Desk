import React from 'react';
import { render } from '@react-email/render';

export async function renderEmailTemplate(
  Component: React.ComponentType<any>,
  props: Record<string, any>
): Promise<string> {
  const element = React.createElement(Component, props);
  return await render(element);
}
