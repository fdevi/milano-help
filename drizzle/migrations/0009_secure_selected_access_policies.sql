ALTER POLICY "Anyone can view event likes" ON public.eventi_mi_piace USING (EXISTS (SELECT 1 FROM public.eventi e WHERE e.id = evento_id));
ALTER POLICY "Anyone can view like counts" ON public.annunci_mi_piace USING (EXISTS (SELECT 1 FROM public.annunci a WHERE a.id = annuncio_id));
ALTER POLICY "Users can view likes" ON public.annunci_mi_piace USING (EXISTS (SELECT 1 FROM public.annunci a WHERE a.id = annuncio_id));
ALTER POLICY "view_comments" ON public.annunci_commenti USING (EXISTS (SELECT 1 FROM public.annunci a WHERE a.id = annuncio_id));
ALTER POLICY "Anyone can view event comments" ON public.eventi_commenti USING (EXISTS (SELECT 1 FROM public.eventi e WHERE e.id = evento_id));
ALTER POLICY "view_comment_likes" ON public.annunci_commenti_piace USING (EXISTS (SELECT 1 FROM public.annunci_commenti c WHERE c.id = commento_id));
ALTER POLICY "view_event_comment_likes" ON public.eventi_commenti_piace USING (EXISTS (SELECT 1 FROM public.eventi_commenti c WHERE c.id = commento_id));
ALTER POLICY "Anyone can view recensioni" ON public.recensioni USING (EXISTS (SELECT 1 FROM public.annunci a WHERE a.id = annuncio_id));
ALTER POLICY "view_group_msg_likes" ON public.gruppi_messaggi_piace TO authenticated USING (EXISTS (SELECT 1 FROM public.gruppi_messaggi m WHERE m.id = messaggio_id AND public.is_group_member(auth.uid(), m.gruppo_id)));
ALTER POLICY "view_post_shares" ON public.gruppi_post_condivisioni TO authenticated USING (EXISTS (SELECT 1 FROM public.gruppi_messaggi m WHERE m.id = post_originale_id AND public.is_group_member(auth.uid(), m.gruppo_id)) AND (gruppo_destinazione_id IS NULL OR public.is_group_member(auth.uid(), gruppo_destinazione_id)));
ALTER POLICY "Anyone can read impostazioni" ON public.impostazioni TO authenticated USING (chiave = 'servizi_approvazione_automatica' OR public.has_role(auth.uid(), 'admin'));
ALTER POLICY "Service can insert importazioni_log" ON public.importazioni_log TO service_role WITH CHECK (auth.role() = 'service_role');
ALTER POLICY "Utenti autenticati possono creare eventi" ON public.eventi TO authenticated WITH CHECK (organizzatore_id = auth.uid());
ALTER POLICY "create_notifiche" ON public.notifiche TO authenticated WITH CHECK (
 public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator') OR (
 mittente_id = auth.uid() AND user_id <> auth.uid() AND (
 (tipo = 'like_annuncio' AND EXISTS (SELECT 1 FROM public.annunci a JOIN public.annunci_mi_piace l ON l.annuncio_id = a.id WHERE a.id = riferimento_id AND a.user_id = notifiche.user_id AND l.user_id = auth.uid()))
 OR (tipo = 'recensione' AND EXISTS (SELECT 1 FROM public.annunci a JOIN public.recensioni r ON r.annuncio_id = a.id WHERE a.id = riferimento_id AND a.user_id = notifiche.user_id AND r.utente_id = auth.uid()))
 OR (tipo = 'commento_annuncio' AND EXISTS (SELECT 1 FROM public.annunci a JOIN public.annunci_commenti c ON c.annuncio_id = a.id WHERE a.id = riferimento_id AND a.user_id = notifiche.user_id AND c.user_id = auth.uid()))
 OR (tipo = 'like_evento' AND EXISTS (SELECT 1 FROM public.eventi e JOIN public.eventi_mi_piace l ON l.evento_id = e.id WHERE e.id = riferimento_id AND e.organizzatore_id = notifiche.user_id AND l.user_id = auth.uid()))
 OR (tipo = 'commento_evento' AND EXISTS (SELECT 1 FROM public.eventi e JOIN public.eventi_commenti c ON c.evento_id = e.id WHERE e.id = riferimento_id AND e.organizzatore_id = notifiche.user_id AND c.user_id = auth.uid()))
 OR (tipo = 'partecipazione_evento' AND EXISTS (SELECT 1 FROM public.eventi e JOIN public.eventi_partecipanti p ON p.evento_id = e.id WHERE e.id = riferimento_id AND e.organizzatore_id = notifiche.user_id AND p.user_id = auth.uid() AND p.stato = 'confermato'))
 OR (tipo = 'risposta_commento' AND (EXISTS (SELECT 1 FROM public.annunci_commenti c JOIN public.annunci_commenti p ON p.id = c.parent_id WHERE c.annuncio_id = riferimento_id AND c.user_id = auth.uid() AND p.user_id = notifiche.user_id) OR EXISTS (SELECT 1 FROM public.eventi_commenti c JOIN public.eventi_commenti p ON p.id = c.parent_id WHERE c.evento_id = riferimento_id AND c.user_id = auth.uid() AND p.user_id = notifiche.user_id)))
 OR (tipo = 'menzione_gruppo' AND EXISTS (SELECT 1 FROM public.gruppi_messaggi m WHERE m.id = riferimento_id AND m.mittente_id = auth.uid() AND public.is_group_member(auth.uid(), m.gruppo_id) AND public.is_group_member(notifiche.user_id, m.gruppo_id)))
 )));
ALTER POLICY "Authenticated users can upload annunci images" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'annunci-images' AND owner_id = auth.uid()::text);
ALTER POLICY "Utenti possono caricare il proprio avatar" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);
ALTER POLICY "avatar_insert" ON storage.objects TO authenticated WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);
ALTER POLICY "Utenti possono aggiornare il proprio avatar" ON storage.objects TO authenticated USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text) WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);
ALTER POLICY "avatar_update" ON storage.objects TO authenticated USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text) WITH CHECK (bucket_id = 'avatars' AND owner_id = auth.uid()::text);
ALTER POLICY "avatar_delete" ON storage.objects TO authenticated USING (bucket_id = 'avatars' AND owner_id = auth.uid()::text);