-- Seed the salon's service menu, opening hours and featured offers.
INSERT INTO "services" ("name", "category", "description", "duration", "image") VALUES
('Clean Up', 'Facial & Skin Care', 'A refreshing clean-up tailored to your skin.', 35, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'),
('D-Tan', 'Facial & Skin Care', 'A targeted salon treatment for a fresher-looking complexion.', 30, 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=900&q=85'),
('Bleach', 'Facial & Skin Care', 'A consultation-led beauty service for your preferred look.', 25, 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=900&q=85'),
('Facial', 'Facial & Skin Care', 'A relaxing facial experience customised to your needs.', 50, 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=900&q=85'),
('Advanced Facial', 'Facial & Skin Care', 'An elevated facial experience with a personalised consultation.', 60, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=85'),
('Anti-Ageing Facial', 'Facial & Skin Care', 'A skincare-focused facial designed around your preferences.', 60, 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85'),
('Threading', 'Threading & Waxing', 'Precise grooming for a neat, defined finish.', 15, 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85'),
('Waxing', 'Threading & Waxing', 'A professional waxing service; ask about available areas.', 30, 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=85'),
('Hair Spa', 'Hair Care & Treatments', 'A relaxing hair and scalp care experience.', 45, 'https://images.unsplash.com/photo-1521590832167-7bcbda5f1a8f?auto=format&fit=crop&w=900&q=85'),
('Hair Treatment', 'Hair Care & Treatments', 'Talk with the stylist about your hair goals and options.', 45, 'https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=900&q=85'),
('Keratin', 'Hair Care & Treatments', 'A smoothing service with a consultation before treatment.', 120, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85'),
('Botox Hair Treatment', 'Hair Care & Treatments', 'A salon hair treatment selected to suit your hair goals.', 120, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=85'),
('Nanoplastia', 'Hair Care & Treatments', 'A professional smoothing service; consultation recommended.', 150, 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=85'),
('Straightening', 'Hair Care & Treatments', 'Explore straightening options with a stylist consultation.', 120, 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=900&q=85'),
('Global Hair Colour', 'Hair Colouring', 'A single-tone colour service tailored to your look.', 120, 'https://images.unsplash.com/photo-1519690889869-e705e59f72e1?auto=format&fit=crop&w=900&q=85'),
('Highlights', 'Hair Colouring', 'Add dimension and brightness with customised highlights.', 120, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85'),
('Balayage', 'Hair Colouring', 'Soft, blended colour with a personalised consultation.', 150, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85'),
('Hair Colour', 'Hair Colouring', 'Discuss shades and maintenance with the stylist.', 90, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85'),
('Permanent Eyebrow', 'Eyebrow & Lash Services', 'Book a consultation to discuss shape, style, and suitability.', 90, 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=900&q=85'),
('Lash Extension', 'Eyebrow & Lash Services', 'Enhance your look with a lash style consultation.', 90, 'https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=900&q=85')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "settings" ("key", "value") VALUES
('hours', '{"start":"10:00","end":"19:00","slotMinutes":30,"closedDays":[0]}'),
('offers', '[{"name":"Glow & Refresh","description":"A refreshing facial or clean-up experience. Ask us for a tailored combination.","active":true},{"name":"Hair Transformation","description":"Discuss colour and hair-care options with our stylist.","active":true},{"name":"Brow & Lash","description":"Explore eyebrow and lash services for your preferred look.","active":true}]')
ON CONFLICT ("key") DO NOTHING;
