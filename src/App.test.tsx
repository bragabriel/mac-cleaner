import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import App from './App';

describe('App uninstall navigation', () => {
  it('opens Uninstall Apps without blanking the workspace', async () => {
    const user = userEvent.setup();

    render(<App />);

    const uninstallTrigger = screen.getAllByText('Uninstall Apps')[0]?.closest('button');
    expect(uninstallTrigger).not.toBeNull();

    await user.click(uninstallTrigger!);

    expect(await screen.findByText('Open in Finder')).toBeInTheDocument();
    expect(await screen.findByText(/scan related files/i)).toBeInTheDocument();
  });
});
