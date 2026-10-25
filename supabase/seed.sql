-- GOAT WARS seed. Re-runnable (ON CONFLICT DO NOTHING). Facts verified 24 Oct 2026; REVIEW before launch —
-- affiliations, managers and squads change. Edit in the admin dashboard afterwards.
-- No candidate has a photo: image_url stays NULL until you hold the rights (see README → Images).

insert into candidates (id,name,short_name,subtitle,club_affiliation,highlight_color,stats) values
('a0000000-0000-4000-8000-000000000001','Lionel Messi','Messi','Argentina · Inter Miami CF','Inter Miami CF','#38bdf8','[{"label": "Ballon d’Or", "value": "8"}, {"label": "Champions League titles", "value": "4"}, {"label": "World Cup titles", "value": "1 (2022)"}, {"label": "Copa América titles", "value": "2 (2021, 2024)"}]'::jsonb),
('a0000000-0000-4000-8000-000000000002','Cristiano Ronaldo','Ronaldo','Portugal · Al Nassr','Al Nassr','#ef4444','[{"label": "Ballon d’Or", "value": "5"}, {"label": "Champions League titles", "value": "5"}, {"label": "World Cup titles", "value": "0"}, {"label": "European Championship", "value": "1 (2016)"}]'::jsonb),
('a0000000-0000-4000-8000-000000000003','Cole Palmer','Palmer','Chelsea · England','Chelsea','#60a5fa','[]'::jsonb),
('a0000000-0000-4000-8000-000000000004','Bruno Fernandes','Bruno','Manchester United · Portugal','Manchester United','#dc2626','[]'::jsonb),
('a0000000-0000-4000-8000-000000000005','Manchester City','Man City','Etihad Stadium · 8 Premier League titles','Manchester City','#67e8f9','[]'::jsonb),
('a0000000-0000-4000-8000-000000000006','Arsenal','Arsenal','Emirates Stadium · 2025/26 Premier League champions','Arsenal','#f87171','[]'::jsonb),
('a0000000-0000-4000-8000-000000000007','Liverpool','Liverpool','Anfield · 20 top-flight league titles','Liverpool','#ef4444','[]'::jsonb),
('a0000000-0000-4000-8000-000000000008','Chelsea','Chelsea','Stamford Bridge · 5 Premier League titles','Chelsea','#3b82f6','[]'::jsonb),
('a0000000-0000-4000-8000-000000000009','Mikel Arteta','Arteta','Arsenal','Arsenal','#f87171','[]'::jsonb),
('a0000000-0000-4000-8000-00000000000a','Unai Emery','Emery','Aston Villa','Aston Villa','#a78bfa','[]'::jsonb),
('a0000000-0000-4000-8000-00000000000b','Enzo Maresca','Maresca','Manchester City (appointed June 2026)','Manchester City','#67e8f9','[]'::jsonb),
('a0000000-0000-4000-8000-00000000000c','Xabi Alonso','Alonso','Chelsea','Chelsea','#3b82f6','[]'::jsonb),
('a0000000-0000-4000-8000-000000000020','Tottenham Hotspur','Spurs',null,'Tottenham Hotspur','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000021','Newcastle United','Newcastle',null,'Newcastle United','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000022','Aston Villa','Villa',null,'Aston Villa','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000023','Manchester United','Man Utd',null,'Manchester United','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000024','Brighton & Hove Albion','Brighton',null,'Brighton & Hove Albion','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000025','Nottingham Forest','Forest',null,'Nottingham Forest','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000026','Brentford','Brentford',null,'Brentford','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000027','AFC Bournemouth','Bournemouth',null,'AFC Bournemouth','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000028','Everton','Everton',null,'Everton','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-000000000029','Fulham','Fulham',null,'Fulham','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002a','Crystal Palace','Palace',null,'Crystal Palace','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002b','Leeds United','Leeds',null,'Leeds United','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002c','Sunderland','Sunderland',null,'Sunderland','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002d','Coventry City','Coventry',null,'Coventry City','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002e','Ipswich Town','Ipswich',null,'Ipswich Town','#39E477','[]'::jsonb),
('a0000000-0000-4000-8000-00000000002f','Hull City','Hull',null,'Hull City','#39E477','[]'::jsonb)
on conflict (id) do nothing;

insert into matchups (id,slug,title,category,category_label,question,description,supporting_text,status,voting_type,price_per_vote_kes,max_votes_per_transaction,is_flagship,sort_order,season,rules) values
('b0000000-0000-4000-8000-000000000001','messi-vs-ronaldo','THE GREATEST OF ALL TIME?','players','FLAGSHIP BATTLE','WHO IS THE ULTIMATE GOAT?','Eight Ballons d’Or against five, a World Cup against five Champions Leagues: two very different routes to greatness and a debate that never settles.','Two legends. Millions of opinions. Choose your GOAT and join the battle.','open','paid',10.00,100,true,0,'All-Time','["Votes are sold through Paystack at the price shown for this debate. The price is set on the server, never by your browser.", "Votes are credited only after Paystack confirms your payment. A redirect alone never counts.", "Results show verified votes only. This is a fan opinion poll, not an official ranking."]'::jsonb),
('b0000000-0000-4000-8000-000000000002','palmer-vs-bruno','COLE PALMER VS BRUNO FERNANDES','players','PLAYER BATTLE','WHO’S THE BETTER PLAYER?','Two creative attacking midfielders at two Premier League giants. This is a fan opinion poll: pick the one you would rather have in your team.','Two creative talents. Two different styles. Who would you pick?','open','paid',10.00,100,false,10,'2026/27','["Votes are sold through Paystack at the price shown for this debate. The price is set on the server, never by your browser.", "Votes are credited only after Paystack confirms your payment. A redirect alone never counts.", "Results show verified votes only. This is a fan opinion poll, not an official ranking."]'::jsonb),
('b0000000-0000-4000-8000-000000000003','best-premier-league-club','BEST PREMIER LEAGUE CLUB','clubs','CLUB WARS','WHICH CLUB IS THE BEST?','Judge heritage, modern success, identity and supporters however you like. Voters decide what “best” means.','From the Etihad to Anfield, the Emirates to Stamford Bridge. Cast your vote.','open','paid',10.00,100,false,20,'2026/27','["Votes are sold through Paystack at the price shown for this debate. The price is set on the server, never by your browser.", "Votes are credited only after Paystack confirms your payment. A redirect alone never counts.", "Results show verified votes only. This is a fan opinion poll, not an official ranking."]'::jsonb),
('b0000000-0000-4000-8000-000000000004','premier-league-title-prediction','PREMIER LEAGUE TITLE PREDICTION','predictions','TITLE RACE','WHO WILL WIN THE PREMIER LEAGUE?','Season-long fan prediction poll for 2026/27 covering this season’s 20 clubs. Set the voting deadline in the admin dashboard.','A fan prediction is an opinion poll, not an official outcome or a wager.','open','paid',10.00,100,false,30,'2026/27','["Votes are sold through Paystack at the price shown for this debate. The price is set on the server, never by your browser.", "Votes are credited only after Paystack confirms your payment. A redirect alone never counts.", "Results show verified votes only. This is a fan opinion poll, not an official ranking.", "No wagering and no prizes. Predictions are not official forecasts or league standings."]'::jsonb),
('b0000000-0000-4000-8000-000000000005','best-premier-league-manager','BEST PREMIER LEAGUE MANAGER','managers','MANAGER WARS','WHO’S THE BEST MANAGER?','Tactics, trophies, leadership and results. Candidates are current Premier League managers; the admin team updates the list when managers change.','Tactical genius, trophies, leadership, and results. Who gets your vote?','open','paid',10.00,100,false,40,'2026/27','["Votes are sold through Paystack at the price shown for this debate. The price is set on the server, never by your browser.", "Votes are credited only after Paystack confirms your payment. A redirect alone never counts.", "Results show verified votes only. This is a fan opinion poll, not an official ranking."]'::jsonb)
on conflict (id) do nothing;

insert into matchup_candidates (matchup_id,candidate_id,display_order) values
('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',0),
('b0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002',1),
('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003',0),
('b0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000004',1),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000005',0),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000006',1),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000007',2),
('b0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000008',3),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000005',0),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000006',1),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000007',2),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000008',3),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000020',4),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000021',5),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000022',6),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000023',7),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000024',8),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000025',9),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000026',10),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000027',11),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000028',12),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000029',13),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002a',14),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002b',15),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002c',16),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002d',17),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002e',18),
('b0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-00000000002f',19),
('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000009',0),
('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-00000000000a',1),
('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-00000000000b',2),
('b0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-00000000000c',3)
on conflict do nothing;
