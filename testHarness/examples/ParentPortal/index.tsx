import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
} from '@fluentui/react-components';
import { useState } from 'react';
import { ParentPortal } from '../../src/components/ParentPortal';

/**
 * Demonstrates ParentPortal escaping an iframe.
 * Run this inside the iframe harness (testHarness/iframe.html) to see it
 * render the dialog in the parent document.
 */
export function ParentPortalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <Text block style={{ marginBottom: 8 }}>
        ParentPortal renders Fluent UI components in the parent document,
        escaping iframe boundaries with full styling.
      </Text>

      <Button appearance="primary" onClick={() => setOpen(true)}>
        Open Dialog in Parent
      </Button>

      <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
        <ParentPortal>
          <DialogSurface backdrop={{ appearance: 'dimmed' }}>
            <DialogBody>
              <DialogTitle>Rendered in Parent Document</DialogTitle>
              <DialogContent>
                This dialog is rendered in the parent document, escaping the
                iframe boundary. It has full Fluent UI styling because
                ParentPortal syncs Griffel styles and theme tokens.
              </DialogContent>
              <DialogActions>
                <Button appearance="primary" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </ParentPortal>
      </Dialog>
    </div>
  );
}

export default ParentPortalExample;
