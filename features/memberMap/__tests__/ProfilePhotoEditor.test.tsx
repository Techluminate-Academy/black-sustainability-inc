import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfilePhotoEditor from '../ProfilePhotoEditor';
it('directs members to Mighty without offering an unsupported upload', () => {
 const { container } = render(<ProfilePhotoEditor photoUrl="https://cdn.example.com/photo.jpg" />);
 expect(screen.getByRole('link', { name: 'Open Mighty Networks' })).toHaveAttribute('href', 'https://black-sustainability-network.mn.co/');
 expect(screen.getByAltText('Current profile photo')).toHaveAttribute('src', 'https://cdn.example.com/photo.jpg');
 expect(container.querySelector('input[type=file]')).toBeNull();
 expect(screen.queryByRole('button', { name: 'Save photo' })).not.toBeInTheDocument();
});
