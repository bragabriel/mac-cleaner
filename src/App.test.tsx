import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import App from './App';

describe('App navigation', () => {
  it('opens Uninstall Apps without blanking the workspace', async () => {
    const user = userEvent.setup();

    render(<App />);

    const uninstallTrigger = screen.getAllByText('Uninstall Apps')[0]?.closest('button');
    expect(uninstallTrigger).not.toBeNull();

    await user.click(uninstallTrigger!);

    expect(await screen.findByText('Open in Finder')).toBeInTheDocument();
    expect(await screen.findByText(/scan related files/i)).toBeInTheDocument();
  });

  it('opens Settings as a permission workspace', async () => {
    const user = userEvent.setup();

    render(<App />);

    const settingsTrigger = screen.getAllByText('Settings')[0]?.closest('button');
    expect(settingsTrigger).not.toBeNull();

    await user.click(settingsTrigger!);

    expect(await screen.findByText('Open Full Disk Access')).toBeInTheDocument();
    expect(screen.getByText('Retry check')).toBeInTheDocument();
  });
});
