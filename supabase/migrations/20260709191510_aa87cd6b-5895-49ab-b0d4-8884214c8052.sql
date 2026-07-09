
-- Add explicit FKs from public tables to public.profiles so PostgREST can embed profile data.
-- profiles.id already 1:1 with auth.users.id, so these secondary FKs are safe.

ALTER TABLE public.posts
  ADD CONSTRAINT posts_author_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_author_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_profile_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.conversation_participants
  ADD CONSTRAINT cp_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.adverts
  ADD CONSTRAINT adverts_author_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.likes
  ADD CONSTRAINT likes_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.follows
  ADD CONSTRAINT follows_follower_profile_fkey
  FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT follows_following_profile_fkey
  FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.group_members
  ADD CONSTRAINT group_members_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_creator_profile_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_user_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
