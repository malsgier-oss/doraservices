-- Create a function to distribute messages to users when a platform message is sent
CREATE OR REPLACE FUNCTION public.distribute_platform_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert user_messages for all matching users based on target_audience
  IF NEW.target_audience = 'all' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.status = 'active';
  ELSIF NEW.target_audience = 'users' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'business'
    );
  ELSIF NEW.target_audience = 'businesses' THEN
    INSERT INTO public.user_messages (user_id, message_id)
    SELECT p.user_id, NEW.id
    FROM public.profiles p
    WHERE p.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = p.user_id AND ur.role = 'business'
    );
  END IF;
  
  -- Update delivery count
  UPDATE public.platform_messages 
  SET delivery_count = (
    SELECT COUNT(*) FROM public.user_messages WHERE message_id = NEW.id
  ),
  sent_at = now()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to distribute messages when created
DROP TRIGGER IF EXISTS distribute_message_trigger ON public.platform_messages;
CREATE TRIGGER distribute_message_trigger
  AFTER INSERT ON public.platform_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.distribute_platform_message();

-- Create a function to create a notification for a specific user (for approvals, etc.)
CREATE OR REPLACE FUNCTION public.create_user_notification(
  p_user_id uuid,
  p_title text,
  p_content text
)
RETURNS uuid AS $$
DECLARE
  v_message_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get current user as sender
  v_admin_id := auth.uid();
  
  -- Create the platform message
  INSERT INTO public.platform_messages (sender_id, title, content, target_audience, sent_at)
  VALUES (v_admin_id, p_title, p_content, 'individual')
  RETURNING id INTO v_message_id;
  
  -- Create user_message for specific user
  INSERT INTO public.user_messages (user_id, message_id)
  VALUES (p_user_id, v_message_id);
  
  -- Update delivery count
  UPDATE public.platform_messages SET delivery_count = 1 WHERE id = v_message_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;