from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Q
from projects.models import Project, ProjectMember
from .models import Task
from .serializers import TaskSerializer


def get_user_role(project, user):
    membership = ProjectMember.objects.filter(project=project, user=user).first()
    return membership.role if membership else None


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], members__user=self.request.user
        )

    def get_queryset(self):
        project = self.get_project()
        role = get_user_role(project, self.request.user)
        qs = Task.objects.filter(project=project)

        # Members can only see their own assigned tasks
        if role == 'member':
            qs = qs.filter(assigned_to=self.request.user)

        # Optional filters
        status_filter = self.request.query_params.get('status')
        priority_filter = self.request.query_params.get('priority')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)

        return qs.select_related('assigned_to', 'created_by')

    def perform_create(self, serializer):
        project = self.get_project()
        if get_user_role(project, self.request.user) != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only admins can create tasks.')

        assigned_to_id = self.request.data.get('assigned_to_id')
        serializer.save(
            project=project,
            created_by=self.request.user,
            assigned_to_id=assigned_to_id
        )


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_project(self):
        return get_object_or_404(
            Project, pk=self.kwargs['project_pk'], members__user=self.request.user
        )

    def get_queryset(self):
        project = self.get_project()
        role = get_user_role(project, self.request.user)
        qs = Task.objects.filter(project=project)
        if role == 'member':
            qs = qs.filter(assigned_to=self.request.user)
        return qs

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        project = self.get_project()
        role = get_user_role(project, request.user)

        # Members can only update status of their own tasks
        if role == 'member':
            allowed_fields = {'status'}
            if not set(request.data.keys()).issubset(allowed_fields):
                return Response(
                    {'detail': 'Members can only update the status field.'},
                    status=403
                )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_project()
        if get_user_role(project, request.user) != 'admin':
            return Response({'detail': 'Only admins can delete tasks.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class DashboardView(APIView):
    """Aggregate stats for a project dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = get_object_or_404(
            Project, pk=project_pk, members__user=request.user
        )
        today = timezone.now().date()
        tasks = Task.objects.filter(project=project)

        # Total count
        total = tasks.count()

        # By status
        by_status = {
            'todo': tasks.filter(status='todo').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'done': tasks.filter(status='done').count(),
        }

        # Overdue
        overdue = tasks.filter(due_date__lt=today).exclude(status='done').count()

        # Tasks per user
        per_user = (
            tasks.filter(assigned_to__isnull=False)
            .values('assigned_to__name', 'assigned_to__email')
            .annotate(count=Count('id'))
        )

        return Response({
            'total': total,
            'by_status': by_status,
            'overdue': overdue,
            'per_user': list(per_user),
        })
