import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePhotoEditor from '../ProfilePhotoEditor';
const saved = jest.fn();
const busy = jest.fn();
beforeEach(() => {
 jest.clearAllMocks();
 URL.createObjectURL = jest.fn(() => 'blob:preview'); URL.revokeObjectURL = jest.fn();
 global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({ok:true,photoUrl:'https://cdn.example.com/new.jpg'})});
});
it('previews the selection and saves only when Save photo is clicked', async () => {
 render(<ProfilePhotoEditor photoUrl="https://cdn.example.com/old.jpg" onSaved={saved} onBusyChange={busy} />);
 fireEvent.change(screen.getByLabelText('Choose a new photo'),{target:{files:[new File(['image'],'photo.png',{type:'image/png'})]}});
 expect(screen.getByAltText('Profile photo preview')).toHaveAttribute('src','blob:preview');
 expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Save photo'}));
 await waitFor(()=>expect(saved).toHaveBeenCalledWith('https://cdn.example.com/new.jpg'));
 expect(busy).toHaveBeenLastCalledWith(false);
});
it('keeps the selected photo and displays a failed verification without reporting success', async () => {
 (fetch as jest.Mock).mockResolvedValue({ok:false,json:async()=>({ok:false,error:'Mighty did not confirm the photo.'})});
 render(<ProfilePhotoEditor photoUrl="" onSaved={saved} onBusyChange={busy} />);
 fireEvent.change(screen.getByLabelText('Choose a new photo'),{target:{files:[new File(['image'],'photo.png',{type:'image/png'})]}});
 fireEvent.click(screen.getByRole('button',{name:'Save photo'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Mighty did not confirm');
 expect(saved).not.toHaveBeenCalled();
 expect(screen.getByAltText('Profile photo preview')).toHaveAttribute('src','blob:preview');
});
it('rejects unsupported files without an upload', () => {
 render(<ProfilePhotoEditor photoUrl="" onSaved={saved} onBusyChange={busy} />);
 fireEvent.change(screen.getByLabelText('Choose a new photo'),{target:{files:[new File(['svg'],'photo.svg',{type:'image/svg+xml'})]}});
 expect(screen.getByRole('alert')).toHaveTextContent('JPG, PNG, or WebP');
 expect(fetch).not.toHaveBeenCalled();
});
