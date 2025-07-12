'use client';

import { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';

type EmailTemplateProps = Record<string, any>;

export function renderEmailTemplate(
  Component: React.ComponentType<EmailTemplateProps>,
  data: EmailTemplateProps
): string {
  try {
    return renderToString(Component(data) as ReactElement);
  } catch (error) {
    console.error('Error rendering email template:', error);
    throw error;
  }
}