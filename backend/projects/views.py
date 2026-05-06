from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Project, ProjectMember
from .serializers import ProjectSerializer, ProjectMemberSerializer

User = get_user_model()


def get_user_role(project, user):
    membership = ProjectMember.objects.filter(project=project, user=user).first()
    return membership.role if membership else None


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        ProjectMember.objects.create(project=project, user=self.request.user, role='admin')


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(members__user=self.request.user).distinct()

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if get_user_role(project, request.user) != 'admin':
            return Response({'detail': 'Only admins can update this project.'}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if get_user_role(project, request.user) != 'admin':
            return Response({'detail': 'Only admins can delete this project.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ProjectMemberView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        project = get_object_or_404(Project, pk=pk, members__user=request.user)
        members = project.members.select_related('user').all()
        return Response(ProjectMemberSerializer(members, many=True).data)

    def post(self, request, pk):
        """Add a member — admin only. Accepts user_id (int) OR email (string)."""
        project = get_object_or_404(Project, pk=pk, members__user=request.user)
        if get_user_role(project, request.user) != 'admin':
            return Response({'detail': 'Only admins can add members.'}, status=403)

        role = request.data.get('role', 'member')

        # Support lookup by id OR email
        user_id = request.data.get('user_id')
        email   = request.data.get('email', '').strip().lower()

        if user_id:
            user = get_object_or_404(User, pk=user_id)
        elif email:
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response({'detail': f'No user found with email "{email}".'}, status=404)
        else:
            return Response({'detail': 'Provide user_id or email.'}, status=400)

        if ProjectMember.objects.filter(project=project, user=user).exists():
            return Response({'detail': 'User is already a member of this project.'}, status=400)

        member = ProjectMember.objects.create(project=project, user=user, role=role)
        return Response(ProjectMemberSerializer(member).data, status=201)

    def delete(self, request, pk):
        """Remove a member — admin only."""
        project = get_object_or_404(Project, pk=pk, members__user=request.user)
        if get_user_role(project, request.user) != 'admin':
            return Response({'detail': 'Only admins can remove members.'}, status=403)

        user_id = request.data.get('user_id')
        member  = get_object_or_404(ProjectMember, project=project, user_id=user_id)

        # Prevent admin from removing themselves if they're the only admin
        if member.user == request.user:
            return Response({'detail': 'You cannot remove yourself.'}, status=400)

        member.delete()
        return Response(status=204)