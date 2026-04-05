import React from 'react';
import { RiAlertLine } from '@remixicon/react';

import { Alert, AlertDescription, AlertTitle } from 'ui-common';

interface ErrorCalloutProps {
    message: string;
    details?: string;
}

export const ErrorCallout = ({message, details} : ErrorCalloutProps) => {
    return (
        <Alert>
          <div className="mb-2 flex items-center gap-2">
            <RiAlertLine className="size-4" />
            <AlertTitle>{message}</AlertTitle>
          </div>
          {details && <AlertDescription>{details}</AlertDescription>}
        </Alert>
    )
}
